import h2o
from h2o.automl import H2OAutoML
import pandas as pd
import re, os
from urllib.parse import urlparse

# Start H2O cluster
h2o.init(max_mem_size="6G")

# Directory for saving models
MODEL_DIR = "C:/Users/preet/OneDrive/Desktop/autoctiiii/backend/app/automl/models/"
os.makedirs(MODEL_DIR, exist_ok=True)

# ============================================================
# 1️⃣ Train Phishing Model with Advanced Feature Engineering
# ============================================================
print("🔹 Training Phishing Model with advanced features...")

# Load phishing dataset
phish_df = pd.read_csv("C:/Users/preet/OneDrive/Desktop/autoctiiii/backend/dataset/phishing_dataset.csv")

# --- Clean and preprocess ---
phish_df = phish_df.dropna().drop_duplicates()

# --- Advanced Feature Engineering ---
phish_df["url_length"] = phish_df["url"].str.len()
phish_df["num_dots"] = phish_df["url"].str.count(r"\.")
phish_df["num_digits"] = phish_df["url"].str.count(r"\d")
phish_df["has_https"] = phish_df["url"].str.contains("https").astype(int)
phish_df["has_ip"] = phish_df["url"].str.match(r"^\d+\.\d+\.\d+\.\d+$").astype(int)
phish_df["num_special_chars"] = phish_df["url"].str.count(r"[@%?=+&$#]")
phish_df["num_subdomains"] = phish_df["url"].apply(lambda x: len(urlparse(str(x)).netloc.split('.')) - 2)
phish_df["contains_login"] = phish_df["url"].apply(lambda x: 1 if 'login' in str(x).lower() else 0)
phish_df["contains_bank"] = phish_df["url"].apply(lambda x: 1 if 'bank' in str(x).lower() else 0)
phish_df["contains_secure"] = phish_df["url"].apply(lambda x: 1 if 'secure' in str(x).lower() else 0)
phish_df["contains_update"] = phish_df["url"].apply(lambda x: 1 if 'update' in str(x).lower() else 0)
phish_df["is_shortened"] = phish_df["url"].apply(lambda x: 1 if re.search(r'bit\.ly|goo\.gl|tinyurl|t\.co', str(x)) else 0)

# --- Domain and Path-Based Features ---
phish_df["domain_length"] = phish_df["url"].apply(lambda x: len(urlparse(str(x)).netloc))
phish_df["path_length"] = phish_df["url"].apply(lambda x: len(urlparse(str(x)).path))
phish_df["query_length"] = phish_df["url"].apply(lambda x: len(urlparse(str(x)).query))

# Drop the raw URL column
phish_df = phish_df.drop(columns=["url"])

# Convert to H2O Frame
phish_data = h2o.H2OFrame(phish_df)

# Define features and label
y = "label"
x = [col for col in phish_data.columns if col != y]
phish_data[y] = phish_data[y].asfactor()

# Split train/test
train, test = phish_data.split_frame(ratios=[0.8], seed=42)

# --- Train AutoML with deeper tuning ---
phish_aml = H2OAutoML(
    max_models=50,
    max_runtime_secs=1800,  # 30 minutes
    seed=42,
    balance_classes=True,
    nfolds=5,
    include_algos=["StackedEnsemble", "GBM", "XGBoost"]
)
phish_aml.train(x=x, y=y, training_frame=train)

# --- Evaluate performance ---
phish_leader = phish_aml.leader
perf = phish_leader.model_performance(test)

print("\n✅ PHISHING MODEL PERFORMANCE")
print(perf)

# --- Leaderboard (Top 5 Models) ---
lb = phish_aml.leaderboard
print("\n🏆 TOP MODELS (LEADERBOARD):")
print(lb.head(rows=5))

# --- Save best phishing model ---
phish_model_path = h2o.save_model(model=phish_leader, path=MODEL_DIR, force=True)
print("\n✅ Phishing model saved at:", phish_model_path)
print("------------------------------------------------------------\n")


# ============================================================
# 2️⃣ Train Brute Force Model
# ============================================================
print("🔹 Training Brute Force Model...")

brute_data = h2o.import_file("C:/Users/preet/OneDrive/Desktop/autoctiiii/backend/dataset/bruteforce_dataset.csv")
y = "label"
x = [col for col in brute_data.columns if col != y]
brute_data[y] = brute_data[y].asfactor()

train, test = brute_data.split_frame(ratios=[0.8], seed=42)

brute_aml = H2OAutoML(max_models=30, max_runtime_secs=600, seed=42, balance_classes=True)
brute_aml.train(x=x, y=y, training_frame=train)

brute_leader = brute_aml.leader
print("\n✅ BRUTE FORCE MODEL PERFORMANCE")
print(brute_leader.model_performance(test))

brute_model_path = h2o.save_model(model=brute_leader, path=MODEL_DIR, force=True)
print("✅ Brute Force model saved at:", brute_model_path)
print("------------------------------------------------------------\n")


# ============================================================
# 3️⃣ Train Malware Model
# ============================================================
print("🔹 Training Malware Model...")

malware_data = h2o.import_file("C:/Users/preet/OneDrive/Desktop/autoctiiii/backend/dataset/malware_dataset.csv")
y = "label"
x = [col for col in malware_data.columns if col != y]
malware_data[y] = malware_data[y].asfactor()

train, test = malware_data.split_frame(ratios=[0.8], seed=42)

malware_aml = H2OAutoML(max_models=30, max_runtime_secs=600, seed=42, balance_classes=True)
malware_aml.train(x=x, y=y, training_frame=train)

malware_leader = malware_aml.leader
print("\n✅ MALWARE MODEL PERFORMANCE")
print(malware_leader.model_performance(test))

malware_model_path = h2o.save_model(model=malware_leader, path=MODEL_DIR, force=True)
print("✅ Malware model saved at:", malware_model_path)
print("------------------------------------------------------------\n")

print("🎉 All models trained and saved successfully with improved accuracy and robustness!")
