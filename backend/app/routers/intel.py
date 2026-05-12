# backend/app/routers/intel.py
from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from datetime import datetime
import csv

from app.core.store import SESSIONS


router = APIRouter(prefix="/intel", tags=["Intel"])

INTEL_STATE = {
    "abuse_ips": 0,
    "blacklist_hashes": 0,
    "blacklist_domains": 0,
    "last_updated": datetime.utcnow().isoformat(),
}


def require_admin(authorization: str = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")

    token = authorization.split(" ", 1)[1]
    session = SESSIONS.get(token)

    if not session or session["role"] != "admin":
        raise HTTPException(403, "Admin access required")


@router.get("/status")
def intel_status(admin=Header(None)):
    require_admin(admin)
    return INTEL_STATE


@router.post("/import/abuseipdb")
async def import_abuseipdb(file: UploadFile = File(...), admin=Header(None)):
    require_admin(admin)

    count = 0
    reader = csv.DictReader(file.file.read().decode().splitlines())
    for row in reader:
        if "ip" in row:
            count += 1

    INTEL_STATE["abuse_ips"] += count
    INTEL_STATE["last_updated"] = datetime.utcnow().isoformat()

    return {"imported": count, "duplicates": 0, "errors": 0}


@router.post("/import/hashes")
async def import_hashes(file: UploadFile = File(...), admin=Header(None)):
    require_admin(admin)

    count = 0
    reader = csv.DictReader(file.file.read().decode().splitlines())
    for row in reader:
        if "hash" in row:
            count += 1

    INTEL_STATE["blacklist_hashes"] += count
    INTEL_STATE["last_updated"] = datetime.utcnow().isoformat()

    return {"imported": count, "duplicates": 0, "errors": 0}
