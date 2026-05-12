# backend/app/routers/dashboard.py
from fastapi import APIRouter
from app.state import threats

router = APIRouter(prefix="/dashboard")


@router.get("/threats")
async def get_threats():
    """
    Returns ALL threats for the dashboard.
    Already ordered newest → oldest for better UI.
    """
    ordered = sorted(threats, key=lambda x: x["timestamp"], reverse=True)
    return {
        "total": len(ordered),
        "threats": ordered
    }
