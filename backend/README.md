# Backend

Express + pdf-lib + Mongo (audit).

### Run
```
cp .env.example .env
npm install
npm run dev
```

Original PDFs are served from:
- `GET /pdfs/:pdfId.pdf`

Signed PDFs are served from:
- `GET /signed/:filename`

Main endpoint:
- `POST /api/sign-pdf`
