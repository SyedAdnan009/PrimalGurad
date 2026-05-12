# backend/main.py
from fastapi import Header, HTTPException, status, Query, Body, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid, time, json
import asyncio
import os
import csv
from urllib.parse import urlparse
from datetime import datetime
from fastapi import BackgroundTasks
from app.routers import admin, ml, intel, malware_scan

from app.core.store import USERS, SESSIONS
from app.state import threats as THREATS

#from app.routers import malware





from app.routers import ingest, dashboard
from app.automl.inference import predict_phishing, predict_bruteforce, predict_malware
from app.state import broadcast_new_threat, active_dashboard_connections

# =========================================================
# DATASET INTELLIGENCE LAYER
# =========================================================
KNOWN_PHISHING = set()
KNOWN_LEGIT = set()

def normalize_url(url: str) -> str:
    if not url: return ""
    try:
        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        parsed = urlparse(url)
        netloc = parsed.netloc if parsed.netloc else parsed.path.split('/')[0]
        return netloc.lower()
    except Exception:
        return url.lower()

def safe_load_dataset():
    try:
        csv_path = os.path.join(os.path.dirname(__file__), "dataset", "phishing_dataset.csv")
        if not os.path.exists(csv_path):
            print(f"⚠️ Dataset missing: {csv_path}. Proceeding without dataset pre-check.")
            return

        with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                url_raw = row.get("url", "")
                # Some datasets have "label" or "status"
                label = row.get("label", row.get("status", "")).strip().lower()
                
                if url_raw:
                    norm = normalize_url(url_raw)
                    # Handle multiple common conventions for legitimate/phishing
                    if label in ["phishing", "bad", "malicious", "1"]:
                        KNOWN_PHISHING.add(norm)
                    elif label in ["legitimate", "good", "benign", "safe", "0"]:
                        KNOWN_LEGIT.add(norm)
                        
        print(f"✅ Pre-check memory loaded: {len(KNOWN_PHISHING)} phishing, {len(KNOWN_LEGIT)} legitimate URLs.")
    except Exception as e:
        print(f"⚠️ Error loading dataset, system continuing safely: {e}")

# Run safely at startup without blocking existing logic
safe_load_dataset()

# =========================================================
# BASE APP
# =========================================================
base_app = FastAPI()


base_app.include_router(admin.router)
base_app.include_router(ml.router)
base_app.include_router(intel.router)
# Routers
base_app.include_router(ingest.router, prefix="/api")
base_app.include_router(dashboard.router)

base_app.include_router(malware_scan.router)




# HTTP CORS
base_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "chrome-extension://*",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# WEBSOCKET CORS MIDDLEWARE
# =========================================================
from starlette.types import Scope, Receive, Send, ASGIApp

"""class WebSocketCORSMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "websocket":
            headers = dict(scope.get("headers") or [])
            origin = headers.get(b"origin", b"").decode()

            if origin in ["http://localhost:8080", "http://127.0.0.1:8080"]:
                scope["headers"] = list(scope["headers"]) + [
                    (b"access-control-allow-origin", origin.encode())
                ]

        await self.app(scope, receive, send)"""

# IMPORTANT: NO SPACE HERE
# Correct middleware registration
#base_app.add_middleware(WebSocketCORSMiddleware)

# This is what uvicorn should run
app = base_app


# =========================================================
# HEALTH
# =========================================================
@base_app.get("/health")
def health_check():
    return {"status": "healthy"}

@base_app.get("/")
def read_root():
    return {"status": "healthy", "service": "primalguard"}

# =========================================================
# AUTH
# =========================================================


class LoginRequest(BaseModel):
    username: str
    password: str

@base_app.post("/auth/login")
def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or not user.get("active") or user.get("password") != req.password:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    token = uuid.uuid4().hex
    SESSIONS[token] = {"username": user["username"], "role": user["role"], "created": time.time()}
    user["lastLogin"] = datetime.utcnow().isoformat()

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "user": {
            "username": user["username"],
            "role": user["role"],
            "active": user["active"],
            "lastLogin": user["lastLogin"],
        },
    }

@base_app.get("/auth/me")
def me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    token = authorization.split(" ", 1)[1]
    session = SESSIONS.get(token)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    user = USERS.get(session["username"])
    return {
        "username": user["username"],
        "role": user["role"],
        "active": user["active"],
        "lastLogin": user.get("lastLogin"),
    }

# =========================================================
# THREATS
# =========================================================
class Threat(BaseModel):
    id: str
    timestamp: str
    source: str
    type: str
    severity: str
    confidence: float
    status: str
    assigned_to: Optional[str]
    summary: str
    details: Dict[str, Any]
    events: List[Dict[str, Any]]



@base_app.get("/threats")
def list_threats(page: int = 1, limit: int = 50):
    start = (page - 1) * limit
    end = start + limit
    return {
        "threats": THREATS[start:end],

        "total": len(THREATS),
        "page": page,
        "limit": limit
    }

@base_app.post("/threats")
async def create_threat(threat: Threat, background: BackgroundTasks):
    THREATS.append(threat.dict())   # store dict instead of model
    background.add_task(broadcast_new_threat, threat.dict())
    return {"message": "Threat added", "threat": threat.dict()}


@base_app.websocket("/ws/threats")
async def ws_threats(websocket: WebSocket):
    await websocket.accept()
    active_dashboard_connections.append(websocket)

    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        if websocket in active_dashboard_connections:
            active_dashboard_connections.remove(websocket)



# =========================================================
# FALSE POSITIVES & WHITELIST
# =========================================================
FALSE_POSITIVES = []
WHITELIST = set()

class FPRequest(BaseModel):
    url: str
    type: str
    confidence: float
    timestamp: str
    status: str

@base_app.post("/report-false-positive")
def report_false_positive(fp: FPRequest):
    data = fp.dict()
    data["id"] = uuid.uuid4().hex
    print(f"📥 [DEBUG] Received False Positive Report: {data}")
    FALSE_POSITIVES.append(data)
    return {"message": "False positive recorded", "data": data}

@base_app.get("/false-positives")
def list_false_positives():
    return FALSE_POSITIVES

class FPAction(BaseModel):
    url: str
    action: str

@base_app.post("/false-positive/action")
def fp_action(payload: FPAction):
    url = payload.url
    action = payload.action
    
    if action == "whitelist":
        WHITELIST.add(url)
    
    for item in FALSE_POSITIVES:
        if item["url"] == url:
            item["status"] = "resolved"
    
    return {"message": f"Action '{action}' applied to {url}"}

# =========================================================
# DOWNLOAD SCAN (AUTOMATIC DELETION)
# =========================================================
class ScanDownloadRequest(BaseModel):
    file_path: str

@base_app.post("/scan-download")
def scan_download_endpoint(req: ScanDownloadRequest):
    """
    Endpoint called by browser extension on completed downloads.
    Safely triggers malware scan and potentially deletes the file.
    """
    try:
        from malware_agent import scan_and_handle_file
        result = scan_and_handle_file(req.file_path)
        return result
    except ImportError:
        print("⚠️ malware_agent module could not be imported.")
        return {"status": "error", "reason": "malware_agent missing"}
    except Exception as e:
        print("❌ Scan download error:", e)
        return {"status": "error", "reason": "internal server error"}

# =========================================================
# ML PREDICT
# =========================================================
@base_app.post("/predict/phishing")
def phishing_predict(payload: dict):
    url_raw = payload.get("url", "")
    norm_url = normalize_url(url_raw)

    # 1. Analyst Whitelist Pre-Check
    if url_raw in WHITELIST or norm_url in WHITELIST:
        return {"prediction": "safe", "confidence": 1.0, "severity": "low"}
        
    # 2. Dataset Pre-Check
    if norm_url in KNOWN_PHISHING:
        return {"prediction": "phishing", "confidence": 1.0, "severity": "high"}
    if norm_url in KNOWN_LEGIT:
        return {"prediction": "safe", "confidence": 1.0, "severity": "low"}

    # 3. Existing AutoML Prediction
    return {"prediction": predict_phishing(payload)}

@base_app.post("/predict/bruteforce")
def bruteforce_predict(payload: dict):
    # Same pre-check layer wrap
    url_raw = payload.get("url", "")
    if url_raw:
        norm_url = normalize_url(url_raw)
        if url_raw in WHITELIST or norm_url in WHITELIST:
            return {"prediction": "safe", "confidence": 1.0, "severity": "low"}
        if norm_url in KNOWN_PHISHING:
            return {"prediction": "bruteforce", "confidence": 1.0, "severity": "high"} # Treat known bad as high
        if norm_url in KNOWN_LEGIT:
            return {"prediction": "safe", "confidence": 1.0, "severity": "low"}
            
    return {"prediction": predict_bruteforce(payload)}

@base_app.post("/predict/malware")
def malware_predict(payload: dict):
    url_raw = payload.get("url", "")
    if url_raw:
        norm_url = normalize_url(url_raw)
        if url_raw in WHITELIST or norm_url in WHITELIST:
            return {"prediction": "safe", "confidence": 1.0, "severity": "low"}
        if norm_url in KNOWN_PHISHING:
            return {"prediction": "malware", "confidence": 1.0, "severity": "high"}
        if norm_url in KNOWN_LEGIT:
            return {"prediction": "safe", "confidence": 1.0, "severity": "low"}
            
    return {"prediction": predict_malware(payload)}

@base_app.post("/auth/seed-admin")
def seed_admin():
    if "admin" not in USERS:
        USERS["admin"] = {
            "username": "admin",
            "password": "PrimalGuard@123",
            "role": "admin",
            "active": True,
            "lastLogin": None,
            "createdAt": datetime.utcnow().isoformat(),
        }
    return {"message": "Admin seeded"}

@base_app.get("/threats/{id}")
def get_threat(id: str):
    for t in THREATS:
        if t["id"] == id:
            return t
    raise HTTPException(404, "Threat not found")


@base_app.post("/threats/{id}/assign")
async def assign_threat(id: str, payload: Dict[str, str]):
    for t in THREATS:
        if t["id"] == id:
            t["assigned_to"] = payload.get("assigned_to")
            await broadcast_new_threat(t)
            return t
    raise HTTPException(404, "Threat not found")


@base_app.post("/threats/{id}/status")
async def update_status(id: str, payload: Dict[str, str]):
    for t in THREATS:
        if t["id"] == id:
            t["status"] = payload.get("status")
            await broadcast_new_threat(t)
            return t
    raise HTTPException(404, "Threat not found")


# =========================================================
# AI ASSISTANT (DECISION-SUPPORT)
# =========================================================
class AIAnalysisRequest(BaseModel):
    url: str
    type: str
    confidence: float

AI_CACHE = {}

@base_app.post("/ai-analysis")
async def ai_analysis(req: AIAnalysisRequest):
    """
    Lightweight, optional AI assistant endpoint.
    Provides human-readable context for analyst workflow.
    Does NOT override blocking or automated threat actions.
    """
    import httpx
    import os

    cache_key = f"{req.url}_{req.type}_{req.confidence}"
    if cache_key in AI_CACHE:
        return AI_CACHE[cache_key]

    api_key = os.getenv("GEMINI_API_KEY") 
    fallback_response = {"reason": "AI analysis unavailable. Please review manually.", "recommendation": "Review Needed"}

    if not api_key:
        return fallback_response

    # Prepare improved prompt with mismatch logic and strict constraints
    prompt = f"""
    You are an AI assistant for a cybersecurity SOC. Review the following URL analysis.
    URL: {req.url}
    Detected Type: {req.type}
    Confidence: {req.confidence}
    
    Instructions:
    - Analyze the URL structure for common phishing patterns (e.g., typosquatting, weird subdomains, IP addresses).
    - Note any confidence mismatch (e.g., if confidence is high but the URL belongs to a known safe domain, clearly state it might be a false positive).
    - Keep your reasoning concise.
    
    Output strictly in this JSON format without markdown blocks:
    {{
      "reason": "A concise 1-2 sentence explanation covering URL structure, patterns, and confidence assessment.",
      "recommendation": "Must be exactly one of: 'Likely Safe', 'Review Needed', 'High Risk'"
    }}
    """

    try:
        # Example Gemini API call
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        
        async with httpx.AsyncClient() as client:
            # 2 second max timeout for AI so Analyst isn't delayed
            response = await client.post(gemini_url, json=payload, timeout=2.0)
            
            if response.status_code == 200:
                data = response.json()
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                
                # Resilient JSON parsing
                text = text.strip()
                if text.startswith("```json"):
                    text = text.replace("```json", "", 1)
                elif text.startswith("```"):
                    text = text.replace("```", "", 1)
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                
                try:
                    result = json.loads(text)
                    valid_recommendations = ["Likely Safe", "Review Needed", "High Risk"]
                    rec = result.get("recommendation", "Review Needed")
                    if rec not in valid_recommendations:
                        rec = "Review Needed"

                    final_res = {
                        "reason": result.get("reason", "Analysis completed but reason missing"),
                        "recommendation": rec
                    }
                    AI_CACHE[cache_key] = final_res
                    return final_res
                except json.JSONDecodeError:
                    print(f"Failed to parse AI JSON: {text}")
                    return fallback_response
            else:
                return fallback_response
    except httpx.TimeoutException:
        print("AI Analysis timed out.")
        return fallback_response
    except Exception as e:
        print(f"AI Analysis Failed: {e}")
        return fallback_response
