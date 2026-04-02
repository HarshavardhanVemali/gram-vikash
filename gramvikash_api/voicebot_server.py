"""
Gram Vikash VoiceBot — v13 WORKING

Root cause of all previous failures:
  Manual VAD + buffer-flush pattern does NOT work reliably across multiple turns
  with Gemini Live. After turn 1, the session ignores subsequent ActivityStart/End.

Solution: Use Gemini's BUILT-IN server-side VAD (automatic_activity_detection enabled).
  - Stream audio continuously, always
  - Gemini detects speech boundaries itself
  - No ActivityStart/End, no buffer, no flush
  - We keep our own RMS-based energy detection only for barge-in detection

This matches how the official Google examples actually work in production.
"""

import os, json, base64, asyncio, logging, math, struct, time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
log = logging.getLogger("voicebot")

app    = FastAPI(title="Gram Vikash VoiceBot")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"), http_options={"api_version": "v1alpha"})
MODEL  = "gemini-2.5-flash-native-audio-preview-12-2025"

# Barge-in: how many loud chunks before we consider it intentional interruption
BARGE_THRESHOLD  = int(os.getenv("BARGE_THRESHOLD",  "600"))  # RMS energy
BARGE_CONFIRM    = int(os.getenv("BARGE_CONFIRM",    "3"))    # consecutive chunks

LANGUAGE_PROFILES = {
    "tenglish": {
        "name": "Telugu-English",
        "greeting": "Namaskaram! Nenu Gram Vikash Sevak ni. Meeru panta gurinchi, vaan gurinchi, market rates gurinchi — emi cheppali?",
        "instruction": "Respond in natural Telugu-English mix. Telugu for emotions/farming, English for technical/market terms. 2-3 sentences. No lists.",
    },
    "hinglish": {
        "name": "Hindi-English",
        "greeting": "Namaste! Main Gram Vikash Sevak hoon. Aapki kheti, baarish, ya market prices — kya poochna hai?",
        "instruction": "Respond in natural Hindi-English mix. Hindi for everyday words, English for market/technical terms. 2-3 sentences. No lists.",
    },
    "english": {
        "name": "English",
        "greeting": "Hello! I am Gram Vikash Sevak, your farming assistant. How can I help you with rainfall, market prices, or farming today?",
        "instruction": "Clear simple English. 2-3 sentences. Warm and brief.",
    },
}

def build_system_prompt(language, greeting, context):
    p = LANGUAGE_PROFILES.get(language, LANGUAGE_PROFILES["tenglish"])
    return f"""You are Gram Vikash Sevak — a friendly village agricultural assistant.
Speak like a helpful neighbor, NOT a corporate AI.

OPENING: When conversation starts, immediately say: "{greeting}"

RULES:
- Never say "I am an AI"
- 2-3 short sentences per reply
- Voice only: no bullet points, no lists, no markdown
- Warm tone, end with a follow-up question

LANGUAGE: {p['instruction']}
Auto-detect and switch language if user switches.

TOPICS: rainfall/weather, crop market prices (mandi/MSP), farming tips,
        government schemes (PM-KISAN, insurance, Rythu Bandhu), soil/fertilizer.

HISTORY:
{context}
"""

@dataclass
class Session:
    stream_sid: Optional[str]  = None
    language: str              = "tenglish"
    topic: Optional[str]       = None
    user_name: Optional[str]   = None
    turn_count: int            = 0
    history: deque             = field(default_factory=lambda: deque(maxlen=14))

    # Barge-in tracking only (no manual VAD)
    loud_streak: int           = 0
    bot_speaking: bool         = False

    # Stats
    audio_in: int              = 0
    audio_out: int             = 0

    def add(self, speaker, text):
        self.history.append(f"{speaker.upper()}: {text}"); self.turn_count += 1

    def context(self):
        lines = []
        if self.user_name: lines.append(f"User: {self.user_name}")
        if self.topic:     lines.append(f"Topic: {self.topic}")
        if lines:          lines.append("---")
        return "\n".join(lines + (list(self.history) or ["No history — greet the user now."]))

    def greeting(self):
        return LANGUAGE_PROFILES.get(self.language, LANGUAGE_PROFILES["tenglish"])["greeting"]

    def system_prompt(self):
        return build_system_prompt(self.language, self.greeting(), self.context())


def compute_rms(pcm):
    if len(pcm) < 2: return 0.0
    if len(pcm) % 2: pcm = pcm[:-1]
    n = len(pcm) // 2
    s = struct.unpack(f"<{n}h", pcm)
    return math.sqrt(sum(x*x for x in s) / n)

def up_8k_to_16k(pcm):
    if len(pcm) % 2: pcm += b'\x00'
    return b"".join(pcm[i:i+2] * 2 for i in range(0, len(pcm), 2))

def down_24k_to_8k(pcm):
    if len(pcm) % 2: pcm += b'\x00'
    return b"".join(pcm[i:i+2] for i in range(0, len(pcm), 6))

def down_16k_to_8k(pcm):
    if len(pcm) % 2: pcm += b'\x00'
    return b"".join(pcm[i:i+2] for i in range(0, len(pcm), 4))

TELUGU_CHARS = set("అఆఇఈఉఊఎఏఐఒఓఔంఃకఖగఘచఛజఝటఠడఢణతథదనపఫబభమయరలవశషసహళఱౌై")
HINDI_CHARS  = set("अआइईउऊएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसहािीुूेैोौंः")

def detect_lang(text):
    n = len(text) or 1
    if sum(c in TELUGU_CHARS for c in text) / n > 0.05: return "tenglish"
    if sum(c in HINDI_CHARS  for c in text) / n > 0.05: return "hinglish"
    words = text.lower().split()
    t = sum(1 for w in words if w in {"nenu","meeru","endi","ela","panta","vaan","unnaru","ledhu","manchidi"})
    h = sum(1 for w in words if w in {"main","mujhe","aap","kya","hai","nahi","kheti","baarish","mandi","hoon"})
    if t > h: return "tenglish"
    if h > 0: return "hinglish"
    return "english"

TOPICS = {
    "rainfall":      ["rain","baarish","varsha","weather","forecast","vaan"],
    "market_prices": ["price","rate","mandi","market","msp","keemat","dhar"],
    "farming_tips":  ["crop","seed","fertilizer","pest","sow","harvest","panta","irrigation","rabi","kharif"],
    "government":    ["scheme","pm-kisan","kisan","insurance","subsidy","yojana","loan","rythu","bandhu"],
    "soil":          ["soil","mitti","ph","nutrient","compost","urea","dap","npk"],
}

def detect_topic(text):
    tl = text.lower()
    for topic, kws in TOPICS.items():
        if any(k in tl for k in kws): return topic
    return None

def gemini_config(sess):
    """
    KEY CHANGE vs v9-v12: automatic_activity_detection is ENABLED (default).
    Gemini's server VAD handles speech detection across all turns reliably.
    We just stream audio and let Gemini decide when the user has finished speaking.
    """
    return types.LiveConnectConfig(
        system_instruction=sess.system_prompt(),
        response_modalities=["AUDIO"],
        # No realtime_input_config override = server VAD ON (default)
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
            )
        ),
    )


@app.websocket("/ws/voicebot")
async def voicebot(websocket: WebSocket):
    await websocket.accept()
    log.info("Exotel connected")
    sess = Session()

    params = dict(websocket.query_params)
    if params.get("lang") in LANGUAGE_PROFILES:
        sess.language = params["lang"]

    try:
        async with client.aio.live.connect(model=MODEL, config=gemini_config(sess)) as gs:
            log.info("Gemini Live ready | server_vad=ON | input=16kHz | output=24kHz")
            stop = asyncio.Event()

            async def recv():
                try:
                    while not stop.is_set():
                        try:
                            raw = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                        except asyncio.TimeoutError:
                            try: await websocket.send_json({"event": "ping"})
                            except Exception: stop.set()
                            continue

                        msg = json.loads(raw)
                        ev  = msg.get("event")

                        if ev == "start":
                            sess.stream_sid = msg["start"].get("stream_sid")
                            custom = msg["start"].get("customParameters", {})
                            if custom.get("language") in LANGUAGE_PROFILES:
                                sess.language = custom["language"]
                            if custom.get("user_name"):
                                sess.user_name = custom["user_name"]
                            log.info(f"Call started | SID={sess.stream_sid} | lang={sess.language}")

                            await asyncio.sleep(0.4)
                            # Trigger greeting via text — reliable across all versions
                            try:
                                await gs.send_client_content(
                                    turns=[{"role": "user", "parts": [
                                        {"text": "Hello, please greet me and start the conversation."}
                                    ]}],
                                    turn_complete=True,
                                )
                                log.info("Greeting triggered")
                            except Exception as e:
                                log.error(f"Greeting failed: {e}")

                        elif ev == "media":
                            if not sess.stream_sid:
                                sess.stream_sid = msg.get("stream_sid")

                            raw8k  = base64.b64decode(msg["media"]["payload"])
                            sess.audio_in += 1
                            energy = compute_rms(raw8k)

                            # Barge-in detection: if user speaks loudly while bot is playing
                            if sess.bot_speaking:
                                if energy > BARGE_THRESHOLD:
                                    sess.loud_streak += 1
                                    if sess.loud_streak >= BARGE_CONFIRM:
                                        log.info(f"BARGE-IN (rms={energy:.0f})")
                                        sess.bot_speaking = False
                                        sess.loud_streak  = 0
                                else:
                                    sess.loud_streak = 0

                            # Always stream audio to Gemini — server VAD handles the rest
                            pcm16k = up_8k_to_16k(raw8k)
                            try:
                                await gs.send_realtime_input(
                                    audio=types.Blob(data=pcm16k, mime_type="audio/pcm;rate=16000")
                                )
                            except Exception as e:
                                log.error(f"Audio forward error: {e}")
                                stop.set(); break

                            if sess.audio_in % 200 == 0:
                                log.info(f"Stats | in={sess.audio_in} out={sess.audio_out} "
                                         f"bot={sess.bot_speaking} rms={energy:.0f}")

                        elif ev == "dtmf":
                            digit = msg.get("dtmf", {}).get("digit", "")
                            lmap = {"1":"tenglish","2":"hinglish","3":"english"}
                            if digit in lmap:
                                sess.language = lmap[digit]
                                log.info(f"Language → {sess.language} (DTMF)")

                        elif ev == "text":
                            t = msg.get("text","").strip()
                            if t:
                                dl = detect_lang(t)
                                if dl != sess.language: sess.language = dl
                                if detect_topic(t): sess.topic = detect_topic(t)
                                sess.add("user", t)

                        elif ev == "stop":
                            log.info(f"Call ended | turns={sess.turn_count} "
                                     f"in={sess.audio_in} out={sess.audio_out}")
                            stop.set(); break

                except WebSocketDisconnect:
                    log.info("Exotel disconnected"); stop.set()
                except Exception as e:
                    log.exception(f"recv: {e}"); stop.set()

            async def send():
                try:
                    async for msg in gs.receive():
                        if stop.is_set(): break

                        if msg.server_content and msg.server_content.model_turn:
                            for part in msg.server_content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    raw  = part.inline_data.data
                                    mime = (part.inline_data.mime_type or "").lower()
                                    out8k = down_16k_to_8k(raw) if "16000" in mime else down_24k_to_8k(raw)
                                    sess.audio_out  += 1
                                    sess.bot_speaking = True
                                    if sess.stream_sid:
                                        try:
                                            await websocket.send_json({
                                                "event":      "media",
                                                "stream_sid": sess.stream_sid,
                                                "media": {"payload": base64.b64encode(out8k).decode()},
                                            })
                                        except Exception as e:
                                            log.warning(f"WS send: {e}"); stop.set(); return

                        if msg.server_content and msg.server_content.turn_complete:
                            sess.bot_speaking = False
                            log.info(f"Bot turn complete | out={sess.audio_out}")

                        if msg.server_content:
                            sc = msg.server_content
                            if hasattr(sc, "output_transcription") and sc.output_transcription:
                                t = (sc.output_transcription.text or "").strip()
                                if t:
                                    log.info(f"BOT: {t[:120]}")
                                    sess.topic = detect_topic(t) or sess.topic
                                    sess.add("bot", t)
                            if hasattr(sc, "input_transcription") and sc.input_transcription:
                                t = (sc.input_transcription.text or "").strip()
                                if t:
                                    log.info(f"USER: {t[:120]}")
                                    dl = detect_lang(t)
                                    if dl != sess.language:
                                        log.info(f"Lang auto → {dl}"); sess.language = dl
                                    sess.topic = detect_topic(t) or sess.topic
                                    sess.add("user", t)

                except Exception as e:
                    if not stop.is_set(): log.exception(f"send: {e}")
                    stop.set()

            await asyncio.gather(recv(), send())

    except WebSocketDisconnect:
        log.info("Disconnected before session")
    except Exception as e:
        log.exception(f"Global: {e}")


@app.get("/health")
async def health():
    return {
        "status":      "ok",
        "model":       MODEL,
        "server_vad":  "ENABLED — Gemini handles all turn detection",
        "input_hz":    16000,
        "output_hz":   24000,
        "audio":       "continuous stream, no ActivityStart/End",
        "barge_in":    f"rms>{BARGE_THRESHOLD} for {BARGE_CONFIRM} chunks",
    }

@app.get("/languages")
async def langs():
    return {k: v["name"] for k, v in LANGUAGE_PROFILES.items()}

@app.get("/dtmf")
async def dtmf():
    return {"1": "tenglish", "2": "hinglish", "3": "english"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")