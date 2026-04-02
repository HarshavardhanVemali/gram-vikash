# Gram Vikash — Comprehensive Technical Guide

> **Audience**: Developers, contributors, and operators who want a deep understanding of how the entire platform works, how to run it, test it, and maintain it.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Backend — Django API (Port 8000)](#3-backend--django-api-port-8000)
4. [VoiceBot Server — FastAPI + Gemini Live (Port 8001)](#4-voicebot-server--fastapi--gemini-live-port-8001)
5. [Frontend — React Native App (Expo)](#5-frontend--react-native-app-expo)
6. [Database & Caching](#6-database--caching)
7. [Authentication Flow](#7-authentication-flow)
8. [Infrastructure & Deployment](#8-infrastructure--deployment)
9. [CI Pipeline](#9-ci-pipeline)
10. [Local Development Runbook](#10-local-development-runbook)
11. [Testing Guide](#11-testing-guide)
12. [API Integrations Deep-Dive](#12-api-integrations-deep-dive)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Project Overview

**Gram Vikash** is an AI-first rural empowerment platform designed for Indian farmers who may have limited literacy and low smartphone familiarity. The platform's primary UX is voice-first — farmers can speak naturally in their regional language (Telugu, Hindi, or English) and get instant AI-powered answers on weather, crop prices, farming tips, and government schemes.

### Core Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Voice-first** | Gemini Live real-time audio; no typing required |
| **Multilingual** | Auto language detection (Telugu, Hindi, English) |
| **Offline-tolerant** | AsyncStorage caching; app remains usable without network |
| **Farmer-grade UX** | Large touch targets, no jargon, regional language UI |
| **Privacy-aware** | JWT auth, FCM token management, no audio stored without consent |

---

## 2. System Architecture

### Service Map

```
                        ┌──────────────────┐
                        │  Farmer's Phone  │
                        │ (Expo React Native)│
                        └───────┬──────────┘
                                │
               ┌────────────────┼─────────────────┐
               │ HTTPS REST     │               WS │
               ▼                ▼                  │
  ┌────────────────────┐ ┌──────────────────────┐  │
  │  Nginx Reverse     │ │  FastAPI VoiceBot    │  │
  │  Proxy (:80/:443)  │ │  (:8001)             │◄─┘
  └────────┬───────────┘ └──────────┬───────────┘
           │                        │
           ▼                        ▼
  ┌────────────────────┐   ┌────────────────────┐
  │  Django API        │   │  Gemini Live API   │
  │  (:8000)           │   │  (Google Cloud)    │
  │                    │   └────────────────────┘
  │  DRF + SimpleJWT   │
  │  Firebase Admin    │──► Firebase (FCM/Auth)
  │  Celery Workers    │──► Redis (broker/cache)
  │  AWS S3 Client     │──► AWS S3 (audio/images)
  └────────┬───────────┘
           │
           ▼
  ┌────────────────────┐
  │  PostgreSQL / SQLite│
  └────────────────────┘
```

### Port Allocation

| Port | Service | Protocol |
|------|---------|----------|
| `80` | Nginx HTTP | TCP |
| `443` | Nginx HTTPS | TCP |
| `8000` | Django API | HTTP |
| `8001` | FastAPI VoiceBot | HTTP + WebSocket |
| `5432` | PostgreSQL | TCP |
| `6379` | Redis | TCP |

---

## 3. Backend — Django API (Port 8000)

### Django App Structure

```
gramvikash_api/
├── core/                    # Project-level config
│   ├── settings.py          # All configuration, env-aware
│   ├── urls.py              # Root URL routing
│   ├── celery.py            # Celery app setup
│   ├── ai_service.py        # Gemini AI helper
│   ├── firebase_init.py     # Firebase Admin SDK init
│   ├── tasks.py             # Celery async tasks
│   └── views.py             # Voice query + Exotel trigger views
├── farmers/                 # Auth, profiles
├── crops/                   # Crop data & advisory
├── market/                  # AgMarkNet price data
├── weather/                 # OpenWeatherMap integration
├── schemes/                 # Government schemes
└── emergency/               # Emergency services
```

### Settings Architecture

All configuration is environment-variable driven. Settings are loaded via `python-dotenv`. Key sections:

```python
# All secrets from env
SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False") == "True"

# JWT — 7-day access tokens, 30-day refresh
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

# Redis for cache (OTP storage) + Celery broker
CACHES = { "default": { "BACKEND": "..RedisCache", "LOCATION": REDIS_URL } }
CELERY_BROKER_URL = REDIS_URL
```

### REST API Modules

#### `farmers` App
Handles phone-number based OTP authentication.
- `POST /api/farmers/send-otp/` — triggers MSG91 OTP
- `POST /api/farmers/verify-otp/` — verifies OTP, returns JWT pair
- `GET /api/farmers/profile/` — farmer profile (JWT required)

#### `crops` App
- `GET /api/crops/` — list crops with seasonal advice
- `GET /api/crops/<id>/` — crop detail with AI disease tips

#### `market` App
- `GET /api/market/prices/` — live mandi prices (cached, refreshed via AgMarkNet)

#### Voice Query Flow (Async)
```
Client → POST /api/voice/query/  (audio_base64 or text)
       ← { task_id: "abc-123" }

Client → GET /api/voice/result/abc-123/
       ← { status: "PENDING" }   (retry)
       ← { status: "SUCCESS", result: "..." }
```

The voice query is processed asynchronously by a Celery worker that calls `core.ai_service` → Gemini API.

### Celery Workers

Started with:
```bash
celery -A core worker --loglevel=info
```

Tasks are defined in `core/tasks.py`. The broker and result backend both use Redis.

---

## 4. VoiceBot Server — FastAPI + Gemini Live (Port 8001)

This is the most technically complex component. It bridges telephony (Exotel) with Google's Gemini Live real-time audio API.

### Why FastAPI (not Django)?

Django's synchronous ORM and WSGI model are incompatible with long-lived WebSocket connections. FastAPI is fully async (ASGI) and handles thousands of concurrent WebSocket connections efficiently with `asyncio`.

### WebSocket Protocol

The VoiceBot speaks Exotel's Media Stream protocol (compatible with Twilio's):

```
Exotel ──WebSocket──► VoiceBot (/ws/voicebot)
  │ {"event": "start", "start": { "stream_sid": "...", "customParameters": {...} }}
  │ {"event": "media", "media": { "payload": "<base64-8kHz-PCM>" }}
  │ {"event": "stop"}
  ◄─────────────────── {"event": "media", "stream_sid": "...", "media": { "payload": "<base64-8kHz-PCM>" }}
```

### Audio Pipeline

```
Exotel sends:    8kHz, 16-bit PCM, mono (mulaw decoded to LPCM)
Gemini expects:  16kHz, 16-bit PCM, mono
Gemini returns:  24kHz, 16-bit PCM, mono
Exotel expects:  8kHz, 16-bit PCM, mono

Conversion chain:
  raw8k  →  up_8k_to_16k()  →  Gemini Live
  Gemini →  down_24k_to_8k()  →  Exotel
```

The conversion functions use simple integer resampling (sample doubling/skipping) to avoid heavy `scipy` dependency.

### Gemini Live Integration

**Key design decision — Server VAD (v13 architecture):**

Previous versions (v1–v12) used manual `ActivityStart`/`ActivityEnd` events to tell Gemini when the user started/stopped speaking. This was unreliable after turn 1.

v13 uses Gemini's built-in server-side Voice Activity Detection:
```python
types.LiveConnectConfig(
    # No realtime_input_config override → server VAD is ON by default
    ...
)
```

Gemini detects speech boundaries itself. We just stream audio continuously and let Gemini respond when it decides the user has finished speaking.

### Session Management

Each WebSocket connection creates a `Session` dataclass:

```python
@dataclass
class Session:
    language: str           # "tenglish" | "hinglish" | "english"
    history: deque          # last 14 turns (7 user + 7 bot)
    topic: Optional[str]    # last detected topic
    user_name: Optional[str]
    loud_streak: int        # for barge-in detection
    bot_speaking: bool      # True while Gemini is sending audio
```

### Language Profiles

| Key | Name | Greeting |
|-----|------|---------|
| `tenglish` | Telugu-English | "Namaskaram! Nenu Gram Vikash Sevak ni..." |
| `hinglish` | Hindi-English | "Namaste! Main Gram Vikash Sevak hoon..." |
| `english` | English | "Hello! I am Gram Vikash Sevak..." |

Language is auto-detected from transcript text using Unicode range checks (Telugu/Hindi chars) and keyword sets.

### Barge-In Detection

While Gemini is speaking (`bot_speaking=True`), we compute the RMS energy of incoming audio packets. If energy exceeds `BARGE_THRESHOLD` (default 600) for `BARGE_CONFIRM` (default 3) consecutive packets, we set `bot_speaking=False` and let Gemini's server VAD handle the new user turn naturally.

```python
BARGE_THRESHOLD = int(os.getenv("BARGE_THRESHOLD", "600"))
BARGE_CONFIRM   = int(os.getenv("BARGE_CONFIRM",   "3"))
```

### Health & Diagnostic Endpoints

```bash
# Check if server is running
curl http://localhost:8001/health

# List available languages
curl http://localhost:8001/languages

# DTMF language map
curl http://localhost:8001/dtmf
```

---

## 5. Frontend — React Native App (Expo)

### Technology Stack

| Library | Purpose |
|---------|---------|
| `expo` SDK 54 | Cross-platform build toolchain |
| `react-navigation` | Stack + bottom tab navigation |
| `zustand` | Lightweight global state management |
| `@react-native-firebase` | Firebase Auth, Firestore, Messaging |
| `expo-av` / `expo-audio` | Audio recording and playback |
| `expo-location` | GPS for weather hyperlocalization |
| `expo-image-picker` | Fasal Doc crop photo capture |
| `expo-secure-store` | Secure JWT token storage |
| `react-native-mmkv` | Fast key-value storage (faster than AsyncStorage) |

### Screen Inventory

| Screen | File | Purpose |
|--------|------|---------|
| Splash | `SplashScreen.jsx` | Animated intro + auth check |
| Language Selection | `LanguageSelectionScreen.jsx` | First-launch language picker |
| Login | `LoginScreen.jsx` | Phone number entry + MSG91 OTP |
| OTP Verification | `OTPVerificationScreen.jsx` | OTP input + JWT acquisition |
| Profile Setup | `ProfileSetupScreen.jsx` | Name, location, crop setup |
| Identity Verification | `IdentityVerificationScreen.jsx` | DigiLocker document KYC |
| Home | `HomeScreen.jsx` | Dashboard hub |
| Hum Bolo | `HumBoloScreen.jsx` | Live AI voice assistant |
| Fasal Doc | `FasalDocScreen.jsx` | AI crop disease detection |
| Market | `MarketScreen.jsx` | Live mandi price board |
| Weather | `WeatherScreen.jsx` | Forecast + rainfall alerts |
| Crops | `CropsScreen.jsx` | Crop advisory |
| Schemes | `SchemesScreen.jsx` | Government scheme browser |
| Emergency | `EmergencyScreen.jsx` | Emergency call/SOS |
| Profile | `ProfileScreen.jsx` | Farmer profile management |

### State Management (Zustand)

Global state is in `src/store/index.js`. Key store slices:
- `auth` — JWT tokens, farmer profile
- `language` — selected language
- `weather` — cached weather data
- `market` — cached market prices

### Environment Variable Pattern

All API keys are accessed via `src/constants/apiKeys.js`:

```javascript
export const API_KEYS = {
    GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    OPENWEATHERMAP_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY || '',
    // ...
};
```

**Never** access `process.env` directly in screen/component files — always go through `API_KEYS`.

### Hum Bolo — Voice Flow

```
1. User taps microphone button
2. expo-audio starts recording → raw audio buffer
3. Audio sent to Django /api/voice/query/ (base64 encoded)
4. Polls /api/voice/result/<task_id>/ until ready
5. Plays synthesized response using expo-speech or expo-av
```

OR for live phone calls:
```
Exotel call → VoiceBot WebSocket (ws://voicebot:8001/ws/voicebot)
```

### Navigation Structure

```
RootNavigator
├── AuthStack (unauthenticated)
│   ├── SplashScreen
│   ├── LanguageSelectionScreen
│   ├── LoginScreen
│   └── OTPVerificationScreen
└── MainStack (authenticated)
    ├── ProfileSetupScreen (first-time)
    ├── IdentityVerificationScreen (optional)
    └── BottomTabNavigator
        ├── HomeScreen
        ├── HumBoloScreen
        ├── MarketScreen
        ├── WeatherScreen
        └── ProfileScreen
            └── (nested) CropsScreen, SchemesScreen, EmergencyScreen, FasalDocScreen
```

---

## 6. Database & Caching

### Development (Default)
SQLite — automatically created on `manage.py migrate`. No setup needed.

### Production
PostgreSQL 16 via Docker or managed PaaS (RDS, Supabase, etc.).

```
DATABASE_URL=postgres://gramvikash_user:password@host:5432/gramvikash_db
```

### Redis Usage

| Use | Key Pattern | TTL |
|-----|-------------|-----|
| OTP verification cache | `otp:<phone>` | 5 minutes |
| Celery task queue | Celery default keys | Until consumed |
| Celery result backend | `celery-task-meta-<id>` | 24 hours |

---

## 7. Authentication Flow

```
┌─────────┐                    ┌─────────────┐              ┌────────┐
│  App    │                    │ Django API  │              │ MSG91  │
└────┬────┘                    └──────┬──────┘              └───┬────┘
     │ POST /api/farmers/send-otp/   │                          │
     │ { "phone": "+91XXXXXXXXXX" }  │                          │
     │──────────────────────────────►│                          │
     │                               │ Send OTP via MSG91       │
     │                               │─────────────────────────►│
     │                               │                          │
     │                               │ Cache OTP in Redis (5m)  │
     │◄──────────────────────────────│                          │
     │ { "message": "OTP sent" }     │                          │
     │                               │                          │
     │ POST /api/farmers/verify-otp/ │                          │
     │ { "phone": "...", "otp": "X" }│                          │
     │──────────────────────────────►│                          │
     │                               │ Verify OTP from Redis    │
     │                               │ Create/fetch Farmer obj  │
     │◄──────────────────────────────│                          │
     │ { "access": "JWT...",         │                          │
     │   "refresh": "JWT..." }       │                          │
     │                               │                          │
     │ Subsequent API calls with:    │                          │
     │ Authorization: Bearer <JWT>   │                          │
     │──────────────────────────────►│                          │
```

JWT access tokens expire after **7 days**. Refresh tokens last **30 days**.

---

## 8. Infrastructure & Deployment

### Docker Compose Services

| Service | Image | Purpose |
|---------|-------|---------|
| `db` | `postgres:16` | Primary database |
| `redis` | `redis:7` | Broker + cache |
| `api` | `./gramvikash_api` | Django WSGI via gunicorn |
| `worker` | `./gramvikash_api` | Celery worker |
| `nginx` | `nginx:alpine` | Reverse proxy |

```bash
# Start everything
docker compose up --build

# Start specific service
docker compose up api worker

# View logs
docker compose logs -f api

# Run migrations inside container
docker compose exec api python manage.py migrate

# Create superuser inside container
docker compose exec api python manage.py createsuperuser
```

### Nginx Config

The nginx configuration (`nginx/nginx.conf`) proxies:
- `/` → Django API (`http://api:8000`)
- `/ws/` → FastAPI VoiceBot (`http://voicebot:8001`, upgrade to WebSocket)

### ngrok (for Exotel Integration)

1. Get your authtoken from [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken)
2. Store it (never in `ngrok.yml`!):
   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```
3. Start tunnels:
   ```bash
   ngrok start --all --config ngrok.yml
   ```
4. Copy the `voicebot` tunnel HTTPS URL and configure it in your Exotel flow as the WebSocket URL.

### Firebase Admin SDK

The SDK JSON file must be available at the path set in `FIREBASE_CREDENTIALS_PATH`. In production:

```bash
# Encode the JSON as base64 for GitHub Actions secret
base64 -i firebase_admin_sdk.json | pbcopy  # copies to clipboard

# In CI, decode it back
echo "$FIREBASE_ADMIN_SDK_JSON" | base64 -d > firebase_admin_sdk.json
```

---

## 9. CI Pipeline

Located at `.github/workflows/ci.yml`. Triggers on push to `main`/`develop` and all PRs to `main`.

### Jobs

```
backend-lint    → Flake8 static analysis on gramvikash_api/
backend-check   → Django manage.py check (needs backend-lint to pass)
frontend-lint   → ESLint (or syntax check) on gramvikash/src/
```

All jobs inject dummy placeholder environment variables so linters and Django's import system work without real credentials.

### Adding a Real Env Secret to CI

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name it exactly as it appears in `.env.example` (e.g., `GEMINI_API_KEY`)
4. Paste your real value
5. In `ci.yml`, reference it: `GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}`

---

## 10. Local Development Runbook

### Quick Start (All services)

```bash
# Terminal 1 — Redis (if not using Docker)
redis-server

# Terminal 2 — Django API
cd gramvikash_api
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Terminal 3 — Celery Worker
cd gramvikash_api
source venv/bin/activate
celery -A core worker --loglevel=info

# Terminal 4 — FastAPI VoiceBot
cd gramvikash_api
source venv/bin/activate
python voicebot_server.py

# Terminal 5 — React Native App
cd gramvikash
npx expo start
```

Or use the helper script (starts Django + FastAPI):
```bash
./start_local.sh
```

### Regenerate Django SECRET_KEY

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Reset Database (development)

```bash
cd gramvikash_api
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

---

## 11. Testing Guide

> The project currently prioritizes integration and linting as CI validation. Unit tests can be added following these patterns.

### Backend — Django

```bash
cd gramvikash_api
source venv/bin/activate

# Run Django's built-in test runner
python manage.py test

# Run specific app
python manage.py test farmers.tests

# Run with coverage (install first: pip install coverage)
coverage run manage.py test
coverage report
```

**Writing a Django test:**
```python
# farmers/tests.py
from django.test import TestCase
from django.urls import reverse

class OTPFlowTest(TestCase):
    def test_send_otp_requires_phone(self):
        response = self.client.post(reverse('send_otp'), {})
        self.assertEqual(response.status_code, 400)
```

### Backend — VoiceBot (FastAPI)

```bash
pip install pytest httpx pytest-asyncio

# Create test file
cat > test_voicebot.py << 'EOF'
from fastapi.testclient import TestClient
from voicebot_server import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_languages():
    r = client.get("/languages")
    assert "tenglish" in r.json()
EOF

pytest test_voicebot.py -v
```

### Frontend — React Native

Since Expo uses Jest:
```bash
cd gramvikash
npm install --save-dev jest @testing-library/react-native

# Run tests
npx jest
```

### Manual API Testing with curl

```bash
# Health check
curl http://localhost:8001/health

# Send OTP (Django)
curl -X POST http://localhost:8000/api/farmers/send-otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone": "+911234567890"}'

# Get market prices (with JWT)
curl http://localhost:8000/api/market/prices/ \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 12. API Integrations Deep-Dive

### Gemini AI (google-genai SDK)

Used in two places:

| Use | API | Model |
|-----|-----|-------|
| VoiceBot live audio | `genai.Client.aio.live.connect()` | `gemini-2.5-flash-native-audio-preview` |
| Async voice queries | `genai.Client.models.generate_content()` | `gemini-2.0-flash` (or similar) |

Configure the Gemini API key only in the backend. The frontend does NOT make direct Gemini calls.

### OpenWeatherMap

**Endpoint used:** One Call API 3.0
```
GET https://api.openweathermap.org/data/3.0/onecall
  ?lat={lat}&lon={lon}
  &appid={OPENWEATHERMAP_API_KEY}
  &units=metric
```

Returns: current weather, hourly forecast (48h), daily forecast (8 days), weather alerts.

### AgMarkNet (data.gov.in)

Provides wholesale mandi prices for commodities across Indian states.

```
GET https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
  ?api-key={AGMARKNET_API_KEY}
  &format=json
  &state=Telangana
  &commodity=Tomato
```

### MSG91 (OTP)

The React Native app uses the MSG91 OTP Widget (in-app component). The backend verifies OTPs using the auth key and template ID:

```python
MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY")
MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID")
```

### Firebase

Two Firebase usages:

| Component | SDK | Purpose |
|-----------|-----|---------|
| React Native App | `@react-native-firebase` | Phone Auth, Firestore reads, Push Notifications |
| Django Backend | `firebase-admin` | Send FCM push notifications to farmers |

### AWS S3

Used for persistent storage of:
- Crop disease photos (uploaded via `expo-image-picker`)
- Processed audio files

Boto3 is configured via env vars in `settings.py`. Files are uploaded via `core/tasks.py` Celery tasks.

---

## 13. Troubleshooting

### VoiceBot Issues

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Bot answers turn 1 but goes silent after | Old manual VAD code | Ensure `realtime_input_config` is NOT overridden (server VAD must be default-on) |
| `GEMINI_API_KEY` not found | `.env` not loaded | Add `load_dotenv()` at top of `voicebot_server.py` (already present) |
| WebSocket disconnects immediately | ngrok free plan timeout | Use paid ngrok or a VPS |
| Audio sounds garbled | Wrong sample rate conversion | Check that Exotel sends 8kHz; verify `up_8k_to_16k` path |

### Django Issues

| Problem | Fix |
|---------|-----|
| `SECRET_KEY` value of `django-insecure-REPLACE...` error in production | Set real `SECRET_KEY` in your `.env` |
| Redis connection refused | Start redis: `redis-server` or `docker compose up redis` |
| Firebase init fails | Ensure `FIREBASE_CREDENTIALS_PATH` points to a valid service account JSON |
| 500 on all API endpoints | Check `DEBUG=True` in `.env` and view the traceback |

### Expo / React Native Issues

| Problem | Fix |
|---------|-----|
| Metro bundler can't resolve module | Run `npm install` in `gramvikash/` |
| API calls failing with network error | Ensure `EXPO_PUBLIC_API_URL` points to host machine IP (not `localhost`) when testing on physical device |
| Expo Go shows blank screen | Check `App.jsx` for navigation initialization errors |
| Firebase Auth fails | Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are current |

---

*This guide is a living document. If you discover out-of-date information, please open a PR to update it — see [CONTRIBUTING.md](CONTRIBUTING.md).*
