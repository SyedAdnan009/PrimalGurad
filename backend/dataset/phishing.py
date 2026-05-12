import re
import pandas as pd
from urllib.parse import urlparse
import os

# Input raw dataset (url,label)
BASE_DIR = os.path.dirname(__file__)
INPUT_FILE = os.path.join(BASE_DIR, "phishing_dataset.csv")

# Output engineered dataset
OUTPUT_FILE = os.path.join(BASE_DIR, "phishing_dataset_features.csv")

def extract_url_features(url: str):
    """Generate engineered features used by your phishing model + extra helps."""
    if pd.isna(url):
        url = ""

    parsed = urlparse(url)
    netloc = parsed.netloc or ""
    path = parsed.path or ""
    query = parsed.query or ""

    return {
        "url_length": len(url),
        "num_dots": url.count("."),
        "num_digits": len(re.findall(r"\d", url)),
        "has_https": 1 if url.startswith("https") else 0,
        "has_ip": 1 if re.match(r"^\d+\.\d+\.\d+\.\d+$", netloc) else 0,
        "num_special_chars": len(re.findall(r"[@%?=+&$#-]", url)),
        "num_subdomains": max(0, len(netloc.split(".")) - 2) if netloc else 0,

        "contains_login": int("login" in url.lower()),
        "contains_bank": int("bank" in url.lower()),
        "contains_secure": int("secure" in url.lower()),
        "contains_update": int("update" in url.lower()),

        "is_shortened": int(bool(re.search(r"(bit\.ly|goo\.gl|tinyurl|t\.co|ow\.ly|is\.gd|buff\.ly)", url.lower()))),

        "domain_length": len(netloc),
        "path_length": len(path),
        "query_length": len(query),

        # Stronger lexical signals
        "ratio_digits": (len(re.findall(r'\d', url)) / (len(url) + 1)),
        "ratio_special": (len(re.findall(r"[@%?=+&$#-]", url)) / (len(url) + 1)),
    }

print("\n📥 Loading raw phishing dataset...")
df = pd.read_csv(INPUT_FILE)

if "url" not in df.columns or "label" not in df.columns:
    raise ValueError("Dataset must contain 'url' and 'label' columns.")

print("🧠 Extracting engineered features...")
features = df["url"].astype(str).apply(extract_url_features)
features_df = pd.DataFrame(features.tolist())

# ✅ Include the original URL column
output_df = pd.concat([df["url"], features_df, df["label"].astype(int)], axis=1)

print("✅ Saving engineered dataset with URL included to:", OUTPUT_FILE)
output_df.to_csv(OUTPUT_FILE, index=False)

print("\n🎉 Feature engineering completed!")
print("New columns:", list(output_df.columns))
print("Rows processed:", len(output_df))
