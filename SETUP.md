# AgroSeva — Setup Guide

> **For anyone cloning this repo for the first time.**

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Python** | 3.11+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Expo Go** | Latest | Install from Play Store / App Store |

---

## 1. Clone the Repo

```bash
git clone <your-repo-url>
cd AGROSEVA-APP-v2
```

---

## 2. Backend Setup

```bash
cd backend
python -m pip install -r requirements.txt
```

### ⚠️ ML Model (Not Included in Repo — Get from Teammate)

The disease detection model (`plant_disease_model.h5`, ~31 MB) is **too large for Git** and is excluded via `.gitignore`.

**Ask the repo owner to share `plant_disease_model.h5`** (via Google Drive / WhatsApp / USB) and place it at:
```
backend/ml/online/plant_disease_model.h5
```

That's it — no training needed. The model works plug-and-play.

> **Note:** The system still works without the model — only disease detection will be unavailable. Everything else (Water Stress Scanner, irrigation, sensors) works fine.

### Groq API Key (Optional — for AI diagnosis text)

Create a `.env` file in `backend/`:
```
GROQ_API_KEY=your_key_here
```
Get a free key at [console.groq.com](https://console.groq.com)

---

## 3. Frontend Setup

```bash
cd app
npm install --legacy-peer-deps
```

> The `--legacy-peer-deps` flag is needed due to React version mismatches (harmless).

---

## 4. Configure Your IP Address

Edit `app/src/config/api.ts` and set your laptop's IP:

```typescript
export const LAPTOP_IP_ADDRESS = 'http://YOUR_IP:8001';
```

**Find your IP:**
- **Windows:** Run `ipconfig` → look for "IPv4 Address"
- **Mac/Linux:** Run `ifconfig` or `ip addr`

> ⚠️ Do NOT use `localhost` or `127.0.0.1` — the phone cannot reach localhost.

---

## 5. Run the App

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
python run_server.py
```
Server starts at `http://0.0.0.0:8001`

**Terminal 2 — Frontend:**
```bash
cd app
npx expo start -c
```
Scan the QR code with Expo Go on your phone.

> **Tip:** If you get a network error on the phone, try `npx expo start -c --tunnel`

---

## 6. Verify Everything Works

| Feature | How to Test |
|---------|-------------|
| **Dashboard** | Open app → Home tab shows sensor data |
| **Disease Scan** | Scan tab → "Disease Scan" mode → capture a leaf photo |
| **Water Stress** | Scan tab → "Water Stress" mode → capture a crop photo |
| **Backend API** | Visit `http://YOUR_IP:8001/health` in browser |

---

## Project Structure

```
AGROSEVA-APP-v2/
├── backend/
│   ├── server/           # FastAPI server
│   │   ├── vision/       # Water Stress Scanner module (new)
│   │   ├── server.py     # Main entry point
│   │   └── ...
│   ├── ml/online/        # Disease detection model (NOT in repo)
│   ├── drl/              # DRL irrigation agent
│   └── requirements.txt
├── app/
│   ├── src/
│   │   ├── screens/      # React Native screens
│   │   ├── services/     # API service files
│   │   └── config/       # API config (set your IP here)
│   └── package.json
└── SETUP.md              # ← You are here
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Failed to download remote update` | Use `npx expo start -c --tunnel` or ensure phone + laptop are on same WiFi |
| `Network request failed` | Check IP in `api.ts`, ensure backend is running |
| Disease scan shows "model not found" | Download `plant_disease_model.h5` (see Step 2) |
| `npm install` fails with ERESOLVE | Add `--legacy-peer-deps` flag |
| `pip` not found | Use `python -m pip install ...` instead |
