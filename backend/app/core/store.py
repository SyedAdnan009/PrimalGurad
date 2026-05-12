# backend/app/core/store.py
from typing import Dict, Any
from datetime import datetime

# ---- USERS ----
USERS = {
    "admin": {
        "username": "admin",
        "password": "PrimalGuard@123",
        "role": "admin",
        "active": True,
        "lastLogin": None,
        "createdAt": datetime.utcnow().isoformat(),
    },
    "analyst": {
        "username": "analyst",
        "password": "analyst123",
        "role": "analyst",
        "active": True,
        "lastLogin": None,
        "createdAt": datetime.utcnow().isoformat(),
    },
}

# ---- SESSIONS ----
SESSIONS = {}


# ---- ML MODELS ----
ACTIVE_MODELS = []


# Global in-memory threat store
threats: list[Dict[str, Any]] = []
