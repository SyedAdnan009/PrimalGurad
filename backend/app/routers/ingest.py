from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
import uuid
from datetime import datetime, timezone

from app.detectors.phishing import detect_phishing
from app.detectors.bruteforce import detect_bruteforce

from app.automl.inference import predict_phishing, predict_bruteforce
from app.state import threats, broadcast_new_threat

router = APIRouter(prefix="/ingest", tags=["ingest"])


def now():
    return datetime.now(timezone.utc).isoformat()


def severity_from_confidence(conf):
    try:
        conf = float(conf)
    except:
        conf = 0.0

    if conf >= 0.85:
        return "critical"
    elif conf >= 0.60:
        return "high"
    elif conf >= 0.40:
        return "medium"
    else:
        return "low"

def run_detectors(log):
    results = []

    run_time = now()

    raw_url = str(log.get("url") or log.get("original_url") or "").strip()
    url = raw_url.lower()

    # If no URL → ignore
    if not url or len(url) < 8:
        return []

    def make_event(type_name, severity, confidence, summary, status):
        return {
            "id": str(uuid.uuid4()),
            "timestamp": run_time,
            "source": raw_url or "unknown",
            "type": type_name,
            "severity": severity,
            "confidence": float(confidence),
            "status": status,
            "summary": summary,
            "details": log,
            "events": []
        }

    # ===============================
    # GLOBAL DEDUPE (for all URLs)
    # ===============================
    for t in threats:
        if t.get("source") == raw_url:
            print("[DEBUG] Duplicate URL ignored:", raw_url)
            return []

    # ===============================
    # PHISHING DETECTION
    # ===============================
    rb = detect_phishing(log)
    if rb:
        conf = rb["confidence"]
        results.append(make_event(
            "phishing",
            severity_from_confidence(conf),
            conf,
            rb["summary"],
            "new"
        ))
        return results

    ml = predict_phishing({"url": raw_url})
    label = ml["label"]
    conf = ml["confidence"]

    if label == 1:
        results.append(make_event(
            "phishing",
            severity_from_confidence(conf),
            conf,
            "AutoML phishing detected",
            "new"
        ))
        return results

    # ===============================
    # SAFE LINK (NORMAL WEBSITE)
    # ===============================
    results.append(make_event(
        "safe_traffic",
        "low",
        0.05,
        "Normal safe website",
        "resolved"
    ))

    return results


    # Otherwise: safe → ignore
    return []



@router.post("/log")
async def ingest_log(log: Dict[str, Any]):
    detected = run_detectors(log)

    for t in detected:
        threats.append(t)
        try:
            await broadcast_new_threat(t)
        except:
            pass

    return {"status": "ok", "detected": detected}


@router.websocket("/ws")
async def websocket_ingest(ws: WebSocket):
    await ws.accept()

    try:
        while True:
            raw = await ws.receive_text()
            log = json.loads(raw)

            detected = run_detectors(log)

            for t in detected:
                threats.append(t)
                try:
                    await broadcast_new_threat(t)
                except:
                    pass

            await ws.send_json({"detected": detected})

    except WebSocketDisconnect:
        pass
