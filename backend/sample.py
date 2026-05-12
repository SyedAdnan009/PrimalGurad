# sample.py - TEST WITH ENGINEERED FEATURES
from app.automl.inference import predict_phishing, predict_bruteforce, predict_malware

print('=== TESTING WITH ENGINEERED FEATURES ===')

# Test with already-engineered features (bypass URL extraction)
test_phishing_engineered = {
    'url_length': 65,
    'num_dots': 4,
    'num_digits': 6, 
    'has_https': 0,
    'has_ip': 0,
    'num_special_chars': 5
}

# Test brute force with numeric features
test_bruteforce = {
    'ip_address': 8061,  # Already numeric
    'username': 989,     # Already numeric
    'failed_attempts': 15,
    'successful_attempts': 0,
    'time_window': 5
}

# Test malware
test_malware = {
    'file_size_kb': 5120,
    'entropy': 7.8,
    'api_calls': 45,
    'suspicious_imports': 8,
    'is_packed': 1
}

print('Testing phishing with engineered features:', test_phishing_engineered)
print('Phishing prediction:', predict_phishing(test_phishing_engineered))

print('\nTesting brute force:', test_bruteforce)
print('Brute force prediction:', predict_bruteforce(test_bruteforce)) 

print('\nTesting malware:', test_malware)
print('Malware prediction:', predict_malware(test_malware))

print('\n=== TESTS COMPLETE ===')