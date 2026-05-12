import h2o
from h2o.automl import H2OAutoML
import pandas as pd
import re, os
from urllib.parse import urlparse

h2o.init(max_mem_size="4G")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "app", "automl", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

BASE = os.path.dirname(__file__)

# ── 1. PHISHING MODEL ──────────────────────────────────────
print("🔹 Training Phishing Model...")
phish_df = pd.read_csv(os.path.join(BASE, "dataset", "phishing_dataset.csv"))
phish_df = phish_df.dropna().drop_duplicates()

phish_df["url_length"]        = phish_df["url"].str.len()
phish_df["num_dots"]          = phish_df["url"].str.count(r"\.")
phish_df["num_digits"]        = phish_df["url"].str.count(r"\d")
phish_df["has_https"]         = phish_df["url"].str.contains("https").astype(int)
phish_df["has_ip"]            = phish_df["url"].str.match(r"^\d+\.\d+\.\d+\.\d+$").astype(int)
phish_df["num_special_chars"] = phish_df["url"].str.count(r"[@%?=+&$#]")
phish_df["num_subdomains"]    = phish_df["url"].apply(lambda x: len(urlparse(str(x)).netloc.split('.')) - 2)
phish_df["contains_login"]    = phish_df["url"].apply(lambda x: 1 if 'login'  in str(x).lower() else 0)
phish_df["contains_bank"]     = phish_df["url"].apply(lambda x: 1 if 'bank'   in str(x).lower() else 0)
phish_df["contains_secure"]   = phish_df["url"].apply(lambda x: 1 if 'secure' in str(x).lower() else 0)
phish_df["contains_update"]   = phish_df["url"].apply(lambda x: 1 if 'update' in str(x).lower() else 0)
phish_df["is_shortened"]      = phish_df["url"].apply(lambda x: 1 if re.search(r'bit\.ly|goo\.gl|tinyurl|t\.co', str(x)) else 0)
phish_df["domain_length"]     = phish_df["url"].apply(lambda x: len(urlparse(str(x)).netloc))
phish_df["path_length"]       = phish_df["url"].apply(lambda x: len(urlparse(str(x)).path))
phish_df["query_length"]      = phish_df["url"].apply(lambda x: len(urlparse(str(x)).query))
phish_df = phish_df.drop(columns=["url"])

phish_data = h2o.H2OFrame(phish_df)
phish_data["label"] = phish_data["label"].asfactor()
train, test = phish_data.split_frame(ratios=[0.8], seed=42)

aml = H2OAutoML(max_models=10, max_runtime_secs=300, seed=42, balance_classes=True)
aml.train(x=[c for c in phish_data.columns if c != "label"], y="label", training_frame=train)
path = h2o.save_model(model=aml.leader, path=MODEL_DIR, force=True)
print("✅ Phishing model saved:", path)

# ── 2. BRUTE FORCE MODEL ───────────────────────────────────
print("🔹 Training Brute Force Model...")
brute_data = h2o.import_file(os.path.join(BASE, "dataset", "bruteforce_dataset.csv"))
brute_data["label"] = brute_data["label"].asfactor()
train, test = brute_data.split_frame(ratios=[0.8], seed=42)

aml2 = H2OAutoML(max_models=10, max_runtime_secs=300, seed=42, balance_classes=True)
aml2.train(x=[c for c in brute_data.columns if c != "label"], y="label", training_frame=train)
path2 = h2o.save_model(model=aml2.leader, path=MODEL_DIR, force=True)
print("✅ Brute Force model saved:", path2)

# ── 3. MALWARE MODEL ───────────────────────────────────────
print("🔹 Training Malware Model...")
malware_data = h2o.import_file(os.path.join(BASE, "dataset", "malware_dataset.csv"))
malware_data["label"] = malware_data["label"].asfactor()
train, test = malware_data.split_frame(ratios=[0.8], seed=42)

aml3 = H2OAutoML(max_models=10, max_runtime_secs=300, seed=42, balance_classes=True)
aml3.train(x=[c for c in malware_data.columns if c != "label"], y="label", training_frame=train)
path3 = h2o.save_model(model=aml3.leader, path=MODEL_DIR, force=True)
print("✅ Malware model saved:", path3)

print("\n🎉 All models retrained and saved! Restart your backend now.")
h2o.cluster().shutdown()