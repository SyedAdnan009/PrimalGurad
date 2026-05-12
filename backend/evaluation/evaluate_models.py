import os
import pandas as pd
import numpy as np
import h2o
from h2o.frame import H2OFrame
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import matplotlib.pyplot as plt
import seaborn as sns
from urllib.parse import urlparse
import re
from pathlib import Path

# ============================================================
# 1. FIXED PATHS
# ============================================================
BASE_DIR = Path(__file__).resolve().parent      # backend/evaluation
BACKEND_DIR = BASE_DIR.parent                  # backend/
MODEL_DIR = BACKEND_DIR / "app" / "automl" / "models"
DATASET_DIR = BACKEND_DIR / "dataset"
OUT_DIR = BASE_DIR / "evaluation_outputs"
OUT_DIR.mkdir(exist_ok=True)

# ============================================================
# 2. FEATURE ENGINEERING (PHISHING)
# ============================================================
def extract_url_features(url):
    parsed = urlparse(url)
    netloc = parsed.netloc or ""
    path = parsed.path or ""

    return {
        "url_length": len(url),
        "num_dots": url.count("."),
        "num_digits": len(re.findall(r"\d", url)),
        "has_https": 1 if url.startswith("https") else 0,
        "has_ip": 1 if re.match(r"^\d+\.\d+\.\d+\.\d+$", url) else 0,
        "num_special_chars": len(re.findall(r"[@%?=+&$#-]", url)),
        "num_subdomains": len(netloc.split(".")) - 2 if "." in netloc else 0,
        "contains_login": 1 if "login" in url.lower() else 0,
        "contains_bank": 1 if "bank" in url.lower() else 0,
        "contains_secure": 1 if "secure" in url.lower() else 0,
        "contains_update": 1 if "update" in url.lower() else 0,
        "is_shortened": 1 if re.search(r"bit\.ly|goo\.gl|tinyurl|t\.co", url) else 0,
        "domain_length": len(netloc),
        "path_length": len(path),
        "query_length": len(parsed.query),
    }

# ============================================================
# 3. INITIALIZE H2O
# ============================================================
h2o.init()

# ============================================================
# 4. CORRECTED MODEL + DATASET MAPPING
# ============================================================
models = {
    "Bruteforce": {
        "model": "DRF_1_AutoML_2_20251102_224030",
        "dataset": "bruteforce_dataset.csv",
        "target": "label"
    },
    "Phishing": {
        "model": "GBM_grid_1_AutoML_1_20251102_221021_model_4",
        "dataset": "phishing_dataset.csv",
        "target": "label"
    },
    "Malware": {
        "model": "GLM_1_AutoML_3_20251102_225032",
        "dataset": "malware_dataset.csv",   # ✅ corrected
        "target": "label"
    }
}

results = {}

# ============================================================
# 5. EVALUATION LOOP
# ============================================================
for name, cfg in models.items():

    print(f"\n========== Evaluating {name} Model ==========")

    model_path = MODEL_DIR / cfg["model"]
    dataset_path = DATASET_DIR / cfg["dataset"]
    target = cfg["target"]

    # Load model
    model = h2o.load_model(str(model_path))

    # Load dataset
    df = pd.read_csv(dataset_path)

    # ========================================================
    # APPLY FEATURE ENGINEERING FOR PHISHING
    # ========================================================
    if name == "Phishing":
        print("Applying phishing feature engineering...")
        feature_rows = []

        for url in df["url"]:
            feature_rows.append(extract_url_features(url))

        feature_df = pd.DataFrame(feature_rows)
        feature_df[target] = df[target].values
        df = feature_df

    # ========================================================
    # Prepare data
    # ========================================================
    y_true = df[target].values
    X = df.drop(columns=[target])
    hf = H2OFrame(df)

    # Predict
    preds = model.predict(hf).as_data_frame()

    # Extract probability column
    p1 = preds["p1"] if "p1" in preds else preds.iloc[:, -1]
    y_pred = preds["predict"].astype(int)

    # Metrics
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    try:
        auc = roc_auc_score(y_true, p1)
    except:
        auc = 0.0

    results[name] = {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "auc": auc}

    print(f"{name} ACCURACY = {acc*100:.2f}%")

# ============================================================
# 6. ACCURACY BAR GRAPH
# ============================================================
plt.figure(figsize=(8,5))
plt.bar(results.keys(), [r["accuracy"] for r in results.values()])
plt.title("Model Accuracy")
plt.ylabel("Accuracy")
plt.savefig(OUT_DIR / "overall_accuracy.png")
plt.close()

print("\n✅ Evaluation Finished Successfully!")
print(f"✅ Accuracy graph saved to: {OUT_DIR}/overall_accuracy.png")
