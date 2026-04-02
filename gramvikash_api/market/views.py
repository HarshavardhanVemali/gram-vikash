import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

import requests
from django.core.cache import cache
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MandiPrice

logger = logging.getLogger(__name__)

AGMARKNET_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
CACHE_TTL_SECONDS = 4 * 60 * 60

CROP_MAP = {
    "gehun": "Wheat",
    "गेहूं": "Wheat",
    "wheat": "Wheat",
    "chawal": "Rice",
    "rice": "Rice",
    "paddy": "Rice",
    "pyaaz": "Onion",
    "onion": "Onion",
    "aloo": "Potato",
    "potato": "Potato",
    "tamatar": "Tomato",
    "tomato": "Tomato",
    "mirch": "Chilli",
    "chilli": "Chilli",
    "ganna": "Sugarcane",
    "sugarcane": "Sugarcane",
    "kapas": "Cotton",
    "cotton": "Cotton",
}


def normalize_crop_name(raw_name: str) -> str:
    if not raw_name:
        return ""
    cleaned = raw_name.strip().lower()
    return CROP_MAP.get(cleaned, raw_name.strip().title())


def parse_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, AttributeError):
        return Decimal("0")


def parse_date(value):
    if not value:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def compute_trend(commodity, state, market, district):
    today = timezone.now().date()
    week_start = today - timedelta(days=7)

    base_qs = MandiPrice.objects.filter(
        commodity=commodity,
        state__iexact=state,
        market=market,
        district=district,
        arrival_date__gte=week_start,
    )

    latest_date = base_qs.order_by("-arrival_date").values_list("arrival_date", flat=True).first()
    if not latest_date:
        return {"pct_change": 0.0, "trend": "stable"}

    today_avg = base_qs.filter(arrival_date=latest_date).aggregate(avg=Avg("modal_price"))["avg"]
    week_avg = base_qs.aggregate(avg=Avg("modal_price"))["avg"]

    if not week_avg or week_avg == 0:
        return {"pct_change": 0.0, "trend": "stable"}

    pct_change = float(((today_avg or 0) - week_avg) / week_avg * 100)
    if pct_change > 2:
        trend = "up"
    elif pct_change < -2:
        trend = "down"
    else:
        trend = "stable"

    return {"pct_change": round(pct_change, 2), "trend": trend}


class MarketPricesView(APIView):
    """
    GET /api/market/prices/?crop_name=Wheat&state=Maharashtra
    Auth required.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        crop_name = request.query_params.get("crop_name", "").strip()
        state = request.query_params.get("state", "").strip()

        if not crop_name or not state:
            return Response(
                {"error": "crop_name and state are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        normalized_crop = normalize_crop_name(crop_name)
        cache_key = f"market:{state.lower()}:{normalized_crop.lower()}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        api_key = os.getenv("AGMARKNET_API_KEY")
        if not api_key:
            return Response(
                {"error": "AGMARKNET_API_KEY not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            params = {
                "api-key": api_key,
                "format": "json",
                "limit": 100,
                "filters[commodity]": normalized_crop,
                "filters[state]": state,
            }
            api_resp = requests.get(AGMARKNET_URL, params=params, timeout=15)
            if not api_resp.ok:
                return Response(
                    {"error": f"Agmarknet API error: {api_resp.status_code}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )
            payload = api_resp.json()
        except Exception as exc:
            logger.exception("Agmarknet fetch failed")
            return Response(
                {"error": f"Agmarknet request failed: {str(exc)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        records = payload.get("records", [])
        if not records:
            empty_response = {
                "mandis": [],
                "best_price": None,
                "best_mandi": None,
                "data_source": "Agmarknet / data.gov.in",
            }
            cache.set(cache_key, empty_response, CACHE_TTL_SECONDS)
            return Response(empty_response, status=status.HTTP_200_OK)

        parsed_rows = []
        for row in records:
            arrival_date = parse_date(row.get("arrival_date"))
            if not arrival_date:
                continue

            commodity = row.get("commodity", normalized_crop)
            market = row.get("market", "")
            district = row.get("district", "")
            state_name = row.get("state", state)
            modal_price = parse_decimal(row.get("modal_price"))
            min_price = parse_decimal(row.get("min_price"))
            max_price = parse_decimal(row.get("max_price"))

            if not market or modal_price == 0:
                continue

            MandiPrice.objects.update_or_create(
                commodity=commodity,
                state=state_name,
                district=district,
                market=market,
                arrival_date=arrival_date,
                defaults={
                    "min_price": min_price,
                    "max_price": max_price,
                    "modal_price": modal_price,
                },
            )

            parsed_rows.append({
                "commodity": commodity,
                "state": state_name,
                "district": district,
                "market": market,
                "min_price": float(min_price),
                "max_price": float(max_price),
                "modal_price": float(modal_price),
                "arrival_date": arrival_date.isoformat(),
            })

        if not parsed_rows:
            empty_response = {
                "mandis": [],
                "best_price": None,
                "best_mandi": None,
                "data_source": "Agmarknet / data.gov.in",
            }
            cache.set(cache_key, empty_response, CACHE_TTL_SECONDS)
            return Response(empty_response, status=status.HTTP_200_OK)

        parsed_rows.sort(key=lambda x: x["modal_price"], reverse=True)
        top_rows = parsed_rows[:5]

        mandis = []
        for idx, row in enumerate(top_rows, start=1):
            trend_info = compute_trend(
                commodity=row["commodity"],
                state=row["state"],
                market=row["market"],
                district=row["district"],
            )
            mandis.append({
                "rank": idx,
                "mandi_name": row["market"],
                "district": row["district"],
                "state": row["state"],
                "commodity": row["commodity"],
                "modal_price": row["modal_price"],
                "min_price": row["min_price"],
                "max_price": row["max_price"],
                "arrival_date": row["arrival_date"],
                "trend": trend_info["trend"],
                "pct_change": trend_info["pct_change"],
            })

        best = mandis[0] if mandis else None
        response_data = {
            "mandis": mandis,
            "best_price": best["modal_price"] if best else None,
            "best_mandi": best["mandi_name"] if best else None,
            "data_source": "Agmarknet / data.gov.in",
        }

        cache.set(cache_key, response_data, CACHE_TTL_SECONDS)
        return Response(response_data, status=status.HTTP_200_OK)
