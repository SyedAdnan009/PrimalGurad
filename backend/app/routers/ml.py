# backend/app/routers/ml.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
import os, uuid, shutil
from datetime import datetime

from app.core.store import SESSIONS, ACTIVE_MODELS

router = APIRouter(prefix="/ml", tags=["ML Models"])

MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)


# -----------------------------------------------------------
# ADMIN CHECK (CORRECT)
# -----------------------------------------------------------
def require_admin(authorization: str = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ", 1)[1]
    session = SESSIONS.get(token)

    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")

    if session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# -----------------------------------------------------------
# LIST MODELS  (frontend → /ml/models)
# -----------------------------------------------------------
@router.get("/models")
def list_models(authorization: str = Header(None)):
    require_admin(authorization)
    return ACTIVE_MODELS


# -----------------------------------------------------------
# UPLOAD MODEL  (frontend → POST /ml/models/upload)
# -----------------------------------------------------------
@router.post("/models/upload")
def upload_model(
    name: str,
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    require_admin(authorization)

    if not file.filename.endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Only .pkl files allowed")

    model_id = uuid.uuid4().hex
    filepath = os.path.join(MODELS_DIR, f"{model_id}.pkl")

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    model_info = {
        "id": model_id,
        "name": name,
        "file": filepath,
        "file_size": os.path.getsize(filepath),
        "accuracy": None,
        "active": False,
        "created_at": datetime.utcnow().isoformat()
    }

    ACTIVE_MODELS.append(model_info)

    return model_info


# -----------------------------------------------------------
# ACTIVATE MODEL  (frontend → POST /ml/models/{id}/activate)
# -----------------------------------------------------------
@router.post("/models/{model_id}/activate")
def activate_model(model_id: str, authorization: str = Header(None)):
    require_admin(authorization)

    # deactivate all
    for m in ACTIVE_MODELS:
        m["active"] = False

    # activate selected
    for m in ACTIVE_MODELS:
        if m["id"] == model_id:
            m["active"] = True
            return m

    raise HTTPException(status_code=404, detail="Model not found")
