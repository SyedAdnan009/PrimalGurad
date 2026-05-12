import h2o
from app.automl.inference import phishing_model, bruteforce_model, malware_model

def evaluate_model(model, test_path: str, label: str):
    """Evaluate an H2O model on test data and print performance metrics."""
    h2o.init()
    test = h2o.import_file(test_path)
    perf = model.model_performance(test)
    print(f"\n📊 Evaluation for {model.model_id}:")
    print("Accuracy:", perf.accuracy()[0][1])
    print("Precision:", perf.precision()[0][1])
    print("Recall:", perf.recall()[0][1])
    print("F1 Score:", perf.F1()[0][1])
    print("AUC:", perf.auc())
    return perf

if __name__ == "__main__":
    # Example usage (update paths to your real test datasets)
    evaluate_model(phishing_model, "dataset/phishing_dataset.csv", "label")
    evaluate_model(bruteforce_model, "dataset/bruteforce_dataset.csv", "label")
    evaluate_model(malware_model, "dataset/malware_dataset.csv", "label")
