<div align="center">

# Gram Vikash

**An AI-powered rural empowerment platform for Indian farmers**

[![CI](https://github.com/HarshavardhanVemali/gram-vikash/actions/workflows/ci.yml/badge.svg)](https://github.com/HarshavardhanVemali/gram-vikash/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.1-092E20.svg)](https://djangoproject.com)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4.svg)](https://ai.google.dev)

[Features](#features)  [Architecture](#architecture)  [Detailed Tech Stack](#detailed-tech-stack)  [API Integration Roster](#api-integration-roster)  [Getting Started](#getting-started)  [Support](#support)

</div>

---

## What is Gram Vikash?

Gram Vikash is an end-to-end AI platform that bridges the digital divide for rural farming communities in India. It enables farmers to access real-time weather, live mandi (market) prices, government scheme information, and an intelligent voice assistant in their native language including Telugu, Hindi, and English.

The platform relies on a dual-backend architecture combining Django for robust CRUD, authentication, and external REST integrations, alongside FastAPI to manage asynchronous, real-time audio WebSocket streams with Google's latest conversational AI models.

---

## Features

### Mobile Application
- **Hum Bolo** - Multilingual AI voice assistant powered by Gemini 2.5 Flash Native Audio.
- **Fasal Doc** - AI crop disease detection via photograph analysis.
- **Market Rates** - Live mandi and Minimum Support Price (MSP) tracking.
- **Weather Forecast** - Hyper-local weather aggregation with daily and hourly forecasting.
- **Government Schemes** - Curated scheme discovery tool covering PM-KISAN, Rythu Bandhu, and crop insurance frameworks.
- **Emergency** - One-tap field emergency service routing.
- **Profile & Identity** - Telephone-based OTP login with MSG91 and KYC document verification through DigiLocker.

### Administrative & Backend Systems
- JWT-based stateless authentication over SimpleJWT.
- Async task queue managed by Celery and Redis.
- Direct AWS S3 integration for decentralized audio and crop imagery processing.
- Multi-app modular Django architecture incorporating `farmers`, `crops`, `market`, `weather`, `schemes`, and `emergency` domains.

### Live VoiceBot Server
- Real-time streaming audio ingestion utilizing Gemini Live.
- Built-in Server-side Voice Activity Detection (VAD) removing the need for manual turn management.
- Dynamic language auto-detection and fallback execution.
- Barge-in interruption capabilities measuring audio RMS energy.
- PSTN telephony bridging via Exotel WebSockets.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Farmer's Mobile Device                   │
│                React Native App (Expo SDK 54)               │
└────────────┬───────────────────────────┬────────────────────┘
             │ REST (JWT)                │ WebSocket
             ▼                           ▼
┌────────────────────┐    ┌──────────────────────────────────┐
│  Django API :8000  │    │  FastAPI VoiceBot :8001          │
│                    │    │                                  │
│  ┌──────────────┐  │    │  ┌──────────────────────────┐    │
│  │ farmers app  │  │    │  │  Gemini Live (v1alpha)   │    │
│  │ crops app    │  │    │  │  gemini-2.5-flash-native │    │
│  │ market app   │  │    │  │  Server-side VAD         │    │
│  │ weather app  │  │    │  └──────────────────────────┘    │
│  │ schemes app  │  │    │                                  │
│  │ emergency app│  │    │  16kHz PCM in -> 8kHz PCM out    │
│  └──────────────┘  │    └──────────────────────────────────┘
│                    │
│  Celery Workers    │──── Redis (broker + cache)
│  Firebase Admin    │
│  AWS S3 Storage    │──── PostgreSQL (production)
└────────────────────┘     SQLite (local dev)
             │
         Nginx (reverse proxy, SSL termination)
```

---

## Detailed Tech Stack

### Frontend Mobile Application
- **Framework:** React Native
- **Toolkit:** Expo SDK 54 (Managed Workflow)
- **State Management:** Zustand
- **Navigation:** React Navigation (Stack and Bottom Tabs navigators)
- **Storage:** React Native MMKV (high-speed key/value store) and Expo Secure Store for JWT
- **Media:** Expo Audio/AV interfaces for recording microphone inputs
- **Firebase:** `@react-native-firebase` packages for authentication and push notifications integration
- **Styling:** Custom StyleSheet architecture utilizing dynamic font implementations via Expo Google Fonts 
  (Noto Sans Devanagari, Playfair Display, DM Sans, Lora)

### Primary Backend Service
- **Framework:** Django 5.1
- **API Construct:** Django REST Framework 3.15
- **Authentication:** DRF SimpleJWT
- **Task Broker:** Celery 5.4 with Redis 5.x
- **Storage Strategy:** Amazon AWS S3 via boto3
- **Database:** PostgreSQL (Production), SQLite (Development)
- **Deployment Interface:** Gunicorn proxying behind Nginx
- **Language Detection:** `langdetect` library
- **Voice Output:** GenAI APIs and `gTTS` wrapper integrations

### Real-Time Voice Server
- **Framework:** FastAPI 0.115
- **Server Application:** Uvicorn with ASGI architecture
- **WebSockets:** Native Python WebSockets for high-frequency streaming
- **AI Integration:** Google GenAI Python SDK (`google-genai`) running the `v1alpha` Live streaming API.
- **Audio Processing:** Unpacked bytes structuring utilizing `struct` and standard math operations to determine Root Mean Square (RMS) for hardware barge-in detection.

---

## API Integration Roster

Gram Vikash merges data and functionality from multiple high-end third-party systems. Every API involved in the runtime is detailed below:

### 1. Google Gemini AI APIs
* **Gemini Live WebSocket API (`genai.Client.aio.live.connect`):** Streams 16kHz continuous audio buffers synchronously between the user's microphone/PSTN and the Gemini 2.5 Flash Native Audio preview model. Executed in the FastAPI application.
* **Gemini Content Generation API (`genai.Client.models.generate_content`):** Executed in Django's Celery workers. Analyzes multi-modal input including agricultural photography for crop disease mapping and translates asynchronous audio clips. Models used include Gemini 3.1 Pro preview and Gemini 2.0 Flash.

### 2. Market and Trade
* **AgMarkNet (data.gov.in):** Fetches real-time localized mandi wholesale prices. Queried serverside through Django REST frameworks (`api.data.gov.in/resource/...`). Requires authentication token from Open Government Data Platform India.

### 3. Weather Services
* **OpenWeatherMap One Call API 3.0:** Aggregates hyper-local meteorological forecasts. Requested directly client-side from the React Native application (`api.openweathermap.org/data/3.0/onecall`) using GPS latitude and longitude parameters.

### 4. Identity and Authentication
* **MSG91:** Manages the primary login gateway through Indian telephone routing. Utilizes MSG91 React Native widget for the UI and Django POST verification against the MSG91 authentication key infrastructure.
* **DigiLocker:** Facilitates farmer KYC and credential mapping via Government of India digital storage formats. Integrates with Django `farmers` application through standard OAuth 2.0 redirect flows.
* **Firebase Authentication:** Handles device ID clustering, platform token bridging, and legacy login processes. Uses `@react-native-firebase/auth` and `firebase-admin` python structures.

### 5. Telephony and Audio
* **Exotel Media Stream API:** Operates PSTN infrastructure. Connects outbound calls initiated by Django (`api.exotel.com/v1/Accounts/...`) and binds the audio traffic into the FastAPI WebSocket listening port. 
* **ElevenLabs API:** Structured within the environment variable ecosystem to support optional high-quality local language Text-to-Speech fallbacks.

### 6. Cloud Services
* **AWS S3 API:** Manages high-latency binary uploads. Configured with Django utilizing `boto3`. Stores farmer disease-scan photos and long-form task-queue audio input/outputs securely inside the `ap-south-1` region.
* **Google Firebase Cloud Messaging (FCM):** Notifies agricultural alerts directly to the user's mobile device via background syncing.

---

## Getting Started

### Prerequisites

| Toolkit | Minimum Required Version |
|------|----------------|
| Python | 3.11+ |
| Node.js | 20+ |
| npm | 9+ |
| Docker | 24+ |

### Setup and Install

1. Clone the repository
```bash
git clone https://github.com/HarshavardhanVemali/gram-vikash.git
cd gram-vikash
```

2. Establish Configuration
Duplicate local environment templates and apply production keys. Ensure to read `gramvikash_api/.env.example` and `gramvikash/.env.example` to review required tokens.
```bash
cp gramvikash_api/.env.example gramvikash_api/.env
cp gramvikash/.env.example gramvikash/.env
```

3. Initialize Backend Services
Starting the backend relies on Docker to standardize dependencies like Postgres and Redis alongside Django.
```bash
docker compose up --build
```
*Alternatively, you can run services bare-metal utilizing the provided `start_local.sh` initialization file.*

4. Boot the React Native Frontend
```bash
cd gramvikash
npm install
npx expo start
```
Use Expo Go to test live on mobile hardware.

---

## Support

The core application guidelines, commit restrictions, security protocols, and further deep-dive documentation are found throughout the local repository files (`GUIDE.md`, `CONTRIBUTING.md`, `SECURITY.md`).

For any further inquiries, technical problems, deployment assistance, or organizational deployment queries, please contact:

**vemalivardhan@gmail.com**

---
*Developed for the advancement of rural agriculture.*
