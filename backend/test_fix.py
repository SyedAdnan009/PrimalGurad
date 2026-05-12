# check_model_features.py
import h2o
import os

# Initialize H2O
h2o.init(max_mem_size="2G")

MODEL_DIR = "app/automl/models"

# Load models
phishing_model = h2o.load_model(os.path.join(MODEL_DIR, "StackedEnsemble_BestOfFamily_2_AutoML_1_20251004_133115"))
bruteforce_model = h2o.load_model(os.path.join(MODEL_DIR, "GBM_4_AutoML_2_20251004_133624"))
malware_model = h2o.load_model(os.path.join(MODEL_DIR, "DRF_1_AutoML_3_20251004_134127"))

print("=== PHISHING MODEL FEATURES ===")
print("Required features:", phishing_model._model_json["output"]["names"])
print("Feature types:", phishing_model._model_json["output"]["original_names"])

print("\n=== BRUTE FORCE MODEL FEATURES ===")
print("Required features:", bruteforce_model._model_json["output"]["names"])
print("Feature types:", bruteforce_model._model_json["output"]["original_names"])

print("\n=== MALWARE MODEL FEATURES ===")
print("Required features:", malware_model._model_json["output"]["names"])
print("Feature types:", malware_model._model_json["output"]["original_names"])

h2o.cluster().shutdown()