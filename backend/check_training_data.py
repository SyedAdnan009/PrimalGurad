# check_training_data.py
import pandas as pd
import h2o

# Initialize H2O
h2o.init()

print("=== CHECKING TRAINING DATA STRUCTURE ===")

try:
    # Check phishing dataset
    print("\n📊 PHISHING DATASET STRUCTURE:")
    phish_df = pd.read_csv('dataset/phishing_dataset.csv')
    print("Shape:", phish_df.shape)
    print("Columns:", list(phish_df.columns))
    print("First 2 rows:")
    print(phish_df.head(2))
    print("Data types:")
    print(phish_df.dtypes)
    
    # Check what the actual trained model expects
    phishing_model = h2o.load_model("app/automl/models/StackedEnsemble_BestOfFamily_2_AutoML_1_20251004_133115")
    print("\n📋 PHISHING MODEL EXPECTS:")
    print("Features used:", phishing_model._model_json["output"]["names"])
    
except Exception as e:
    print(f"Error: {e}")

h2o.cluster().shutdown()