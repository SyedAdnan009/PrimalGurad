# backend/app/detectors/phishing.py

SUSPICIOUS_KEYWORDS = [
    "password reset",
    "verify your account",
    "your account will be closed",
    "urgent action required",
    "update payment",
    "bank alert",
    "confirm your identity",
    "unauthorized login attempt",
]

PHISHING_DOMAINS = [
    "bit.ly", "tinyurl.com", "direct-link.net",
    "freegift", "winprize", "claim-now",
    "secure-update", "account-verify",
]


# NEW: Strong phishing patterns (URL-based)
PHISHING_PATTERNS = [
    "login", "signin", "verify", "secure", "update", "payment",
    "auth", "reset", "credential", "confirm",
]


SAFE_DOMAINS = [
    "google.com", "youtube.com", "gmail.com", "amazon.com", "microsoft.com",
    "bing.com", "apple.com", "facebook.com", "instagram.com"
]


def detect_phishing(log: dict):
    """
    Rule-based phishing detector.
    Acts as a SECOND LAYER behind ML.
    Must NOT produce false positives.
    """

    url = log.get("url", "").lower().strip()
    msg = log.get("message", "").lower().strip()

    # No URL → ignore
    if not url or len(url) < 8:
        return None

    # Ignore trusted domains
    if any(domain in url for domain in SAFE_DOMAINS):
        return None

    # -----------------------------------------------------------
    # 1) STRONG: keyword-based phishing (message/email content)
    # -----------------------------------------------------------
    if msg and any(keyword in msg for keyword in SUSPICIOUS_KEYWORDS):
        return {
            "type": "phishing",
            "severity": "high",
            "confidence": 0.90,
            "source": log.get("source", url),
            "summary": "Suspicious message content detected",
            "details": log,
            "status": "new"
        }

    # -----------------------------------------------------------
    # 2) Suspicious domain names (shorteners)
    # -----------------------------------------------------------
    if any(domain in url for domain in PHISHING_DOMAINS):
        return {
            "type": "phishing",
            "severity": "medium",
            "confidence": 0.70,
            "source": log.get("source", url),
            "summary": "Suspicious shortened / redirect URL",
            "details": log,
            "status": "new"
        }

    # -----------------------------------------------------------
    # 3) Strong phishing-like URL structure (optional)
    # Only trigger if domain is NOT safe.
    # -----------------------------------------------------------
    if any(pattern in url for pattern in PHISHING_PATTERNS):
        # Weak-only rule: low confidence (ML will confirm)
        return {
            "type": "phishing",
            "severity": "medium",
            "confidence": 0.45,
            "source": log.get("source", url),
            "summary": "Suspicious URL pattern",
            "details": log,
            "status": "investigating"
        }

    return None
