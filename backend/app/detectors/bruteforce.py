# backend/app/detectors/bruteforce.py
def detect_bruteforce(log: dict):
    """Improved brute-force detection with reduced false positives."""
    if log.get("event") != "failed_login":
        return None

    failed = log.get("count", 0)
    ip = log.get("ip", "")

    # Ignore small failures (common user mistake)
    if failed < 5:
        return None

    return {
        "type": "brute_force",
        "severity": "high" if failed > 10 else "medium",
        "confidence": 0.70,
        "source": log.get("source", "auth"),
        "summary": f"{failed} failed login attempts from {ip}",
        "details": log,
        "status": "new"
    }
