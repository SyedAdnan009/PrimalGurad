import os
import re
import pandas as pd
from urllib.parse import urlparse

# ----------------------------------------
# OPTIONAL H2O IMPORT
# ----------------------------------------
try:
    import h2o
except Exception:
    h2o = None

# ----------------------------------------
# MODEL PATHS
# ----------------------------------------
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

PHISHING_MODEL_FILE = "DRF_1_AutoML_1_20260505_201242"
BRUTEFORCE_MODEL_FILE = "DRF_1_AutoML_2_20260505_201747"
MALWARE_MODEL_FILE = "GBM_3_AutoML_3_20260505_202250"

# ----------------------------------------
# GLOBALS
# ----------------------------------------
phishing_model = None
bruteforce_model = None
malware_model = None

phishing_features = []
bruteforce_features = []
malware_features = []


# ----------------------------------------
# H2O INITIALIZER
# ----------------------------------------
def safe_h2o_init(max_mem="2G"):
    """Safely initialize H2O."""
    global h2o
    if h2o is None:
        try:
            import h2o as _h2o
            h2o = _h2o
        except Exception as e:
            print("❌ H2O import failed:", e)
            return False

    try:
        try:
            conn = h2o.connection()
        except Exception:
            conn = None

        if conn is None or not getattr(h2o, "cluster_is_up", lambda: False)():
            h2o.init(max_mem_size=max_mem)

        return True

    except Exception as e:
        print("⚠ H2O init retry:", e)
        try:
            h2o.init(max_mem_size=max_mem)
            return True
        except Exception as e2:
            print("❌ H2O init failed:", e2)
            return False


# ----------------------------------------
# LOAD MODEL SAFELY
# ----------------------------------------
def load_model_safe(path):
    if h2o is None:
        return None, []

    try:
        model = h2o.load_model(path)
    except Exception as e:
        print(f"❌ Failed to load model ({path}):", e)
        return None, []

    try:
        names = model._model_json["output"]["names"]
        response = names[-1]
        expected = [f for f in names if f != response]
    except Exception:
        expected = []

    return model, expected


# ----------------------------------------
# INIT MODELS
# ----------------------------------------
if safe_h2o_init():
    phishing_model, phishing_features = load_model_safe(os.path.join(MODEL_DIR, PHISHING_MODEL_FILE))
    bruteforce_model, bruteforce_features = load_model_safe(os.path.join(MODEL_DIR, BRUTEFORCE_MODEL_FILE))
    malware_model, malware_features = load_model_safe(os.path.join(MODEL_DIR, MALWARE_MODEL_FILE))
else:
    print("⚠ H2O unavailable — running with safe defaults.")


# ----------------------------------------
# FEATURE EXTRACTORS
# ----------------------------------------
def extract_url_features(url):
    if not url:
        return {}

    parsed = urlparse(url)
    netloc = parsed.netloc or ""
    path = parsed.path or ""
    query = parsed.query or ""

    features = {
        "url_length": len(url),
        "num_dots": url.count("."),
        "num_digits": len(re.findall(r"\d", url)),
        "has_https": 1 if url.startswith("https") else 0,
        "has_ip": 1 if re.match(r"^\d+\.\d+\.\d+\.\d+$", netloc) else 0,
        "num_special_chars": len(re.findall(r"[@%?=+&$#-]", url)),
        "num_subdomains": max(len(netloc.split(".")) - 2, 0),
        "contains_login": int("login" in url.lower()),
        "contains_bank": int("bank" in url.lower()),
        "contains_secure": int("secure" in url.lower()),
        "contains_update": int("update" in url.lower()),
        "is_shortened": int(bool(re.search(r"bit\.ly|goo\.gl|tinyurl|t\.co", url))),
        "domain_length": len(netloc),
        "path_length": len(path),
        "query_length": len(query),
    }

    total = len(url)
    features["ratio_digits"] = features["num_digits"] / total if total else 0
    features["ratio_special"] = features["num_special_chars"] / total if total else 0

    return features


def extract_bruteforce_features(log):
    f = {
        "ip_address": str(log.get("ip_address", "unknown")),
        "username": str(log.get("username", "unknown")),
        "failed_attempts": float(log.get("failed_attempts", 0)),
        "successful_attempts": float(log.get("successful_attempts", 0)),
        "time_window": float(log.get("time_window", 0)),
    }
    return f


def extract_malware_features(log):
    fields = ["file_size_kb", "entropy", "api_calls", "suspicious_imports", "is_packed"]
    out = {}
    for f in fields:
        try:
            out[f] = float(log.get(f, 0))
        except:
            out[f] = 0.0
    return out


# ----------------------------------------
# CREATE H2O FRAME
# ----------------------------------------
def create_proper_h2oframe(feat, expected):
    row = {}
    for f in expected:
        row[f] = feat.get(f, "unknown" if any(x in f.lower() for x in ("ip", "user", "name")) else 0)

    df = pd.DataFrame([row])

    if h2o is None:
        return df

    try:
        return h2o.H2OFrame(df)
    except:
        try:
            return h2o.H2OFrame(df.astype(object))
        except:
            return df


# ----------------------------------------
# GET CONFIDENCE SAFELY
# ----------------------------------------
def _get_confidence_from_pred_df(df):
    for col in ("p1", "p(1)", "p_true", "p_yes"):
        if col in df.columns:
            return float(df[col].iloc[0])

    pcols = [c for c in df.columns if c.lower().startswith("p")]
    if pcols:
        return float(df[pcols[-1]].iloc[0])

    # fallback
    for v in df.iloc[0]:
        try:
            return float(v)
        except:
            pass

    return 0.0


# ----------------------------------------
# PHISHING PREDICTOR
# ----------------------------------------
def predict_phishing(payload):
    if phishing_model is None or h2o is None:
        return {"label": 0, "confidence": 0.0}

    try:
        url = payload.get("url", "")
        feat = extract_url_features(url)
        frame = create_proper_h2oframe(feat, phishing_features)

        pred = phishing_model.predict(frame)
        df = pred.as_data_frame()

        raw = max(0.0, min(1.0, _get_confidence_from_pred_df(df)))

        # ---- LIGHT CALIBRATION (SAFE) ----
        if raw >= 0.75:
            conf = raw
        elif raw >= 0.50:
            conf = raw - 0.10
        elif raw >= 0.30:
            conf = raw - 0.15
        else:
            conf = raw * 0.5

        conf = max(0.0, min(1.0, round(conf, 4)))

        if conf >= 0.75:
            label = 1       # phishing
        elif conf >= 0.45:
            label = 2       # suspicious
        else:
            label = 0       # safe

        return {"label": label, "confidence": conf}

    except Exception as e:
        print("predict_phishing error:", e)
        return {"label": 0, "confidence": 0.0}


# ----------------------------------------
# BRUTE FORCE PREDICTOR
# ----------------------------------------
def predict_bruteforce(payload):
    if bruteforce_model is None or h2o is None:
        return {"label": 0, "confidence": 0.0}

    f = extract_bruteforce_features(payload)
    frame = create_proper_h2oframe(f, bruteforce_features)

    pred = bruteforce_model.predict(frame).as_data_frame()
    conf = _get_confidence_from_pred_df(pred)
    conf = round(max(0, min(conf, 1)), 4)

    label = 1 if conf >= 0.30 else 0
    return {"label": label, "confidence": conf}


# ----------------------------------------
# MALWARE PREDICTOR
# ----------------------------------------
def predict_malware(payload):
    if malware_model is None or h2o is None:
        return {"label": 0, "confidence": 0.0}

    f = extract_malware_features(payload)
    frame = create_proper_h2oframe(f, malware_features)

    pred = malware_model.predict(frame).as_data_frame()
    conf = _get_confidence_from_pred_df(pred)
    conf = round(max(0, min(conf, 1)), 4)

    label = 1 if conf >= 0.50 else 0
    return {"label": label, "confidence": conf}


print(
    "🎉 Inference loaded (phishing=%s, bruteforce=%s, malware=%s)"
    % (bool(phishing_model), bool(bruteforce_model), bool(malware_model))
)
