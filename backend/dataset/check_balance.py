# dataset/check_balance.py
import pandas as pd
df = pd.read_csv("phishing_dataset.csv")
print("\n🔍 Label Distribution:")
print(df['label'].value_counts())
print("\n📊 Normalized Distribution (in %):")
print((df['label'].value_counts(normalize=True) * 100).round(6))
