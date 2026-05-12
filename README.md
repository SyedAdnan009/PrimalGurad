# PrimalGuard

Real-time cybersecurity platform that detects **phishing**, **malware**, and **brute-force attacks** using H2O AutoML, a Chrome Extension, and an interactive React dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
  - [1. Clone & Environment Variables](#1-clone--environment-variables)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Datasets](#datasets)
- [Training the Models](#training-the-models)
  - [Quick Retrain (Recommended)](#quick-retrain-recommended)
  - [Full Train with Deep Tuning](#full-train-with-deep-tuning)
  - [Evaluate Trained Models](#evaluate-trained-models)
- [Running the Application](#running-the-application)
  - [Start the Backend](#start-the-backend)
  - [Start the Frontend](#start-the-frontend)
- [Chrome Extension](#chrome-extension)
- [Default Credentials](#default-credentials)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Overview

PrimalGuard is a full-stack cybersecurity platform with three main components:

| Component | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + H2O AutoML | Threat detection API, ML inference, WebSocket live feed |
| **Frontend** | React + TypeScript + Vite | Real-time threat dashboard, admin panel |
| **Chrome Extension** | Manifest V3 | Browser-level phishing and malware blocking |

Detection capabilities:
- **Phishing** — URL-based feature engineering + AutoML classification
- **Brute Force** — Login pattern analysis via AutoML
- **Malware** — File/process signature detection via AutoML

---

## Architecture

```
Browser (Chrome Extension)
        │  POST /api/ingest/log (HTTP)
        ▼
FastAPI Backend (port 8000)
   ├── /api/ingest      → Run detectors → store threat
   ├── /auth            → Login / session management
   ├── /dashboard       → Threat feed, stats
   ├── /ml              → Model management (admin)
   ├── /admin           → User management
   └── /ws/dashboard    → WebSocket live threat stream
        │
        ▼
H2O AutoML Models (loaded at startup)
   ├── Phishing model   (DRF / GBM / StackedEnsemble)
   ├── Brute Force model
   └── Malware model
        │
React Frontend (port 5173)
   └── Dashboard, Admin, Threat Filters, KPI Cards
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | ≥ 3.10 | Backend runtime |
| Java (JDK) | ≥ 11 | Required by H2O AutoML |
| Node.js | ≥ 18 | Frontend build |
| Bun *(optional)* | latest | Faster alternative to npm |
| Git | any | Source control |

> **Important:** H2O requires Java to be installed and on your `PATH`. Verify with `java -version` before running anything.

---

## Project Setup

### 1. Clone & Environment Variables

```bash
git clone <repo-url>
cd PrimalGuard
```

**Backend `.env`** — copy from the example and edit if needed:

```bash
cp backend/.env.example backend/.env
```

```env
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env`** — copy from the example:

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FRONTEND_URL=http://localhost:5173
VITE_WS_BASE_URL=ws://localhost:8000
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt
```

---

### 3. Frontend Setup

```bash
cd frontend

# Using npm
npm install

# Or using Bun (faster)
bun install
```

---

## Datasets

All datasets live in `backend/dataset/`. They are used for training and inference pre-checks.

| File | Used For | Label Column |
|---|---|---|
| `phishing_dataset.csv` | Phishing model training | `label` (0 = legitimate, 1 = phishing) |
| `bruteforce_dataset.csv` | Brute force model training | `label` |
| `malware_dataset.csv` | Malware model training | `label` |
| `phishing_dataset_features.csv` | Feature-engineered phishing data | `label` |

The phishing model applies the following URL features during training and inference:

| Feature | Description |
|---|---|
| `url_length` | Total character length of the URL |
| `num_dots` | Number of dots in the URL |
| `num_digits` | Count of numeric characters |
| `has_https` | 1 if URL uses HTTPS |
| `has_ip` | 1 if host is a raw IP address |
| `num_special_chars` | Count of `@ % ? = + & $ #` characters |
| `num_subdomains` | Number of subdomain levels |
| `contains_login/bank/secure/update` | Keyword presence flags |
| `is_shortened` | 1 if a URL shortener (bit.ly, tinyurl, etc.) is detected |
| `domain_length` | Length of the domain part |
| `path_length` | Length of the URL path |
| `query_length` | Length of the query string |

---

## Training the Models

Trained models are saved to `backend/app/automl/models/`. The backend loads whichever model files are present at startup.

### Quick Retrain (Recommended)

Runs faster training with `max_models=10` and a 5-minute time limit per model. Use this for everyday retraining.

```bash
cd backend
python retrain.py
```

This trains three models sequentially:
1. Phishing model → saved to `app/automl/models/`
2. Brute Force model → saved to `app/automl/models/`
3. Malware model → saved to `app/automl/models/`

> Training time: ~15–25 minutes total (depends on hardware and dataset size).

---

### Full Train with Deep Tuning

Runs extended AutoML with `max_models=50`, 30-minute limit for phishing, cross-validation, and StackedEnsemble/GBM/XGBoost algorithms. Use when you want maximum accuracy.

```bash
cd backend
python app/automl/train.py
```

> Training time: 45–90+ minutes. Requires at least **6 GB of free RAM** (H2O is initialized with `max_mem_size="6G"`).

---

### Evaluate Trained Models

After training, evaluate all three models against their test splits:

```bash
cd backend
python app/automl/evaluate.py
```

Prints per-model:
- Accuracy
- Precision
- Recall
- F1 Score
- AUC

---

## Running the Application

### Start the Backend

```bash
cd backend

# Activate the virtual environment first
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS / Linux

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
1. Load the phishing dataset into memory for pre-checks.
2. Initialize H2O and load the trained AutoML models.
3. Start the FastAPI server at `http://localhost:8000`.

Verify the backend is running:
```
GET http://localhost:8000/health
→ {"status": "healthy"}
```

---

### Start the Frontend

```bash
cd frontend

# Using npm
npm run dev

# Or using Bun
bun run dev
```

Open `http://localhost:5173` in your browser.

---

## Chrome Extension

The extension intercepts browser navigation and reports URLs to the backend for real-time threat detection.

**Load the extension in Chrome:**

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `backend/autocti_chrome_ext/` folder.

The extension will:
- Inspect every page load and send it to `http://localhost:8000/api/ingest/log`.
- Block pages flagged as phishing or malware.
- Show browser notifications for detected threats.

> The backend must be running for the extension to work.

Alternatively, the pre-built `.crx` file is available at `backend/autocti_chrome_ext.crx` for direct installation.

---

## Default Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `PrimalGuard@123` | Admin (full access) |
| `analyst` | `analyst123` | Analyst (read-only) |

> Change these credentials in `backend/app/core/store.py` before deploying.

---

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Health check | None |
| `POST` | `/auth/login` | Login, returns bearer token | None |
| `GET` | `/auth/me` | Current user info | Bearer |
| `POST` | `/api/ingest/log` | Submit a log for threat detection | None |
| `GET` | `/dashboard/threats` | List all detected threats | Bearer |
| `GET` | `/dashboard/stats` | Threat statistics / KPIs | Bearer |
| `WS` | `/ws/dashboard` | Live WebSocket threat stream | Bearer |
| `GET` | `/ml/models` | List uploaded ML models | Admin |
| `POST` | `/ml/models/upload` | Upload a new model | Admin |
| `GET` | `/admin/users` | List users | Admin |
| `POST` | `/admin/users` | Create a user | Admin |
| `GET` | `/intel/...` | Threat intelligence routes | Bearer |
| `POST` | `/malware/scan` | Malware file scan | Bearer |

---

## Project Structure

```
PrimalGuard/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── config.py                  # Environment config
│   ├── retrain.py                 # Quick model retraining script
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variable template
│   ├── dataset/
│   │   ├── phishing_dataset.csv
│   │   ├── bruteforce_dataset.csv
│   │   └── malware_dataset.csv
│   ├── app/
│   │   ├── automl/
│   │   │   ├── train.py           # Full AutoML training (deep tuning)
│   │   │   ├── retrain.py         # Alias / quick train
│   │   │   ├── inference.py       # Model loading & prediction functions
│   │   │   ├── evaluate.py        # Model evaluation script
│   │   │   └── models/            # Saved H2O model files
│   │   ├── core/
│   │   │   └── store.py           # In-memory users, sessions, threats
│   │   ├── detectors/
│   │   │   ├── phishing.py        # Rule-based phishing detector
│   │   │   ├── bruteforce.py      # Rule-based brute force detector
│   │   │   └── malware.py         # Rule-based malware detector
│   │   ├── routers/
│   │   │   ├── ingest.py          # POST /api/ingest/log
│   │   │   ├── dashboard.py       # Threat feed & stats
│   │   │   ├── admin.py           # User management
│   │   │   ├── ml.py              # Model management
│   │   │   ├── intel.py           # Threat intelligence
│   │   │   └── malware_scan.py    # File scanning
│   │   ├── state.py               # Shared threat state & WebSocket broadcast
│   │   └── websocket.py           # WebSocket connection manager
│   └── autocti_chrome_ext/        # Chrome Extension source
│       ├── manifest.json
│       ├── background.js
│       ├── content_script.js
│       └── rules.json
└── frontend/
    ├── src/
    │   ├── pages/                 # Dashboard, Login, Admin pages
    │   ├── components/            # Reusable UI components
    │   ├── services/              # API and threat service layers
    │   ├── stores/                # Auth and threat state (Zustand)
    │   ├── hooks/                 # Custom React hooks
    │   └── types/                 # TypeScript type definitions
    ├── .env.example
    └── package.json
```

---

## Troubleshooting

**H2O fails to start / Java not found**
```
Error: H2O requires Java
```
Install JDK 11+ and ensure `java` is on your system PATH. Verify with:
```bash
java -version
```

---

**Models not loading at startup**
```
⚠️ Model file not found
```
Run `retrain.py` first to generate the model files in `backend/app/automl/models/`. The model file names in `inference.py` (`PHISHING_MODEL_FILE`, `BRUTEFORCE_MODEL_FILE`, `MALWARE_MODEL_FILE`) must match the actual saved file names.

---

**Frontend cannot connect to backend (CORS error)**
Ensure the backend is running on port `8000` and your `frontend/.env` has:
```
VITE_API_BASE_URL=http://localhost:8000
```

---

**Chrome Extension not sending data**
- Ensure the backend is running at `http://localhost:8000`.
- Check that the extension has the `http://localhost:8000/*` permission (already set in `manifest.json`).
- Reload the extension from `chrome://extensions/` after any code changes.

---

**Out of memory during training**
Reduce H2O memory in `retrain.py`:
```python
h2o.init(max_mem_size="2G")   # lower from 4G if needed
```
Or reduce `max_models` and `max_runtime_secs` in the `H2OAutoML(...)` calls.

---

**Port already in use**
```bash
# Find and kill the process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

