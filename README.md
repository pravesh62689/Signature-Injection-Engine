# Signature Injection Engine (Prototype)

This repo is a small prototype that shows how to place fields on a PDF in the browser (responsive),
then burn the signature into the real PDF on the server.

## What is the trick?
We never store pixel coordinates. We store **page-relative %** coords:
- xPct, yPct, wPct, hPct are between 0 and 1
- yPct is measured from the **top** in the browser (DOM style)

On the backend we convert % -> PDF points and flip Y (PDF origin is bottom-left).

## Running locally

### 1) Backend
```
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the frontend and try:
- Drag a Signature box onto the PDF
- Click it and draw a signature
- Hit "Burn signature"
- You will get a signed PDF link back

## Live Demo
- https://signature-injection-engine-khaki.vercel.app/

## Deployments
- Vercel (Frontend): https://signature-injection-engine-khaki.vercel.app/
- Render (Backend): https://signature-injection-engine-52bx.onrender.com

## Video Walkthrough (3 min)
[![Watch the demo]
https://github.com/user-attachments/assets/68ca947a-81be-46f0-9e34-cc11686069f7



