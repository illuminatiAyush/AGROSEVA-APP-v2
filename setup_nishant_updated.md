# AgroSeva — Setup Guide (Nishant Updated)

## Project Structure

```
AGROSEVA-APP-v2/
├── app/          ← React Native (Expo) frontend
└── backend/      ← Python (FastAPI) backend
```

---

## First-Time Setup

### 1. Frontend

```bash
cd app
npm install
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Update IP Address

Open `app/src/config/api.ts` and set your machine's local IP:

```ts
const LAPTOP_IP_ADDRESS = '192.168.x.x';  // ← change this
```

> Find your IP: run `ipconfig` on Windows → look for **IPv4 Address**

---

## Running the Project

Open **two separate terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
python run_server.py
```

**Terminal 2 — Frontend:**
```bash
cd app
npx expo start -c
```

Then scan the QR code with the **Expo Go** app on your phone.

---

## Restoring After Deleting Folders

### Deleted `node_modules`?
```bash
cd app
npm install
```

### Deleted `venv`?
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> ✅ As long as `package.json` (frontend) and `requirements.txt` (backend) are present, you can always rebuild everything from scratch.

---

## ML Model Note

The disease detection model (`plant_disease_model.h5`) is **not included** in the repository due to its large size (~80–100 MB).

- Get it from the team's shared Google Drive
- Place it at: `backend/ml/plant_disease_model.h5`

---

## Sharing the Project (Zip)

To create a clean, small zip without `node_modules` or caches:

```bash
cd AGROSEVA-APP-v2
git archive --format=zip HEAD -o ..\agroseva-share.zip
```

This creates a zip of **only source files** (~5–15 MB). Your local `node_modules` and `venv` are NOT affected.

Your friend then runs the **First-Time Setup** steps above after unzipping.

---

## Quick Reference

| Task | Command |
|---|---|
| Install frontend deps | `cd app && npm install` |
| Install backend deps | `cd backend && pip install -r requirements.txt` |
| Create venv | `python -m venv venv` |
| Activate venv (Windows) | `venv\Scripts\activate` |
| Run backend | `python run_server.py` |
| Run frontend | `npx expo start -c` |
| Create share zip | `git archive --format=zip HEAD -o ../agroseva-share.zip` |
