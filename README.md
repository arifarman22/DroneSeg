# DroneSeg Vision Platform

AI-powered semantic segmentation platform for drone imagery. Upload aerial photos, run SegFormer inference, visualize results on an interactive map, and export GeoJSON.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/Next.js_14-000?style=flat&logo=next.js&logoColor=white)
![Stack](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Stack](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat&logo=pytorch&logoColor=white)

---

## Architecture

```
droneseg/
├── frontend/           Next.js 14 · TypeScript · Tailwind · MapLibre GL
├── backend/            FastAPI · Python 3.11 · Prisma · SegFormer
├── docs/
└── README.md
```

### System Flow

```
Upload Image → Validate → Store (UUID) → Run SegFormer → Save Mask
     ↓                                         ↓
  PostgreSQL                              PostgreSQL
     ↓                                         ↓
  History Page                    MapViewer + DetectionPanel
                                         ↓
                                  Export GeoJSON
```

---

## Features

- **Upload** — Drag-and-drop JPEG/PNG with Pillow validation, UUID filenames, 50MB limit
- **Segmentation** — SegFormer-B0 (ADE20K 150 classes), GPU/CPU auto-detect
- **Map Visualization** — MapLibre GL with raster overlays, bbox polygons synced on zoom/pan
- **Detection Panel** — Per-class visibility toggle, confidence slider, color swatches
- **GeoJSON Export** — Pixel→geographic coordinate conversion with configurable bounds
- **History** — Browse all processed images with mask hover previews

---

## Security

| Layer | Implementation |
|-------|---------------|
| CORS | Whitelist from `CORS_ORIGINS` env var, restricted methods |
| File Validation | Extension + content-type + Pillow verify + format check |
| Path Traversal | UUID filenames, `PurePosixPath.name` sanitization |
| Request Size | Middleware rejects bodies > `MAX_FILE_SIZE_MB` before processing |
| Secrets | All config via `.env`, never committed |
| Error Handling | Global exception handler, no stack traces in responses |
| Logging | Structured logging with configurable level |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (Neon recommended)

### Backend

```bash
cd droneseg/backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
cp .env.example .env           # Fill in DATABASE_URL

prisma generate
prisma db push

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd droneseg/frontend
npm install
npm run dev
```

### Verify

```bash
curl http://localhost:8000/api/health
# {"status":"healthy","model_loaded":true,"model_name":"nvidia/segformer-b0-finetuned-ade-512-512","version":"1.0.0"}
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | *required* |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |
| `UPLOAD_DIR` | Upload storage path | `./uploads` |
| `RESULTS_DIR` | Mask output path | `./results` |
| `MODEL_NAME` | HuggingFace model ID | `nvidia/segformer-b0-finetuned-ade-512-512` |
| `MAX_FILE_SIZE_MB` | Upload size limit | `50` |
| `MAX_INFERENCE_SIZE` | Max image dimension for inference | `1024` |
| `LOG_LEVEL` | Logging verbosity | `INFO` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload/` | Upload drone image |
| `POST` | `/api/detect/` | Run segmentation |
| `GET` | `/api/detect/mask/{id}` | Get mask PNG |
| `GET` | `/api/v1/history/` | List all images |
| `GET` | `/api/v1/history/{id}` | Image detail + detections |
| `GET` | `/api/v1/history/{id}/file` | Serve original image |
| `GET` | `/api/v1/export/geojson/{id}` | Export as GeoJSON |
| `GET` | `/api/health` | Health check |

---

## Database

Prisma ORM with Neon PostgreSQL. Schema in `backend/prisma/schema.prisma`.

**Models:**
- `Image` — file metadata, dimensions, geographic bounds
- `Detection` — model output, mask path, inference time, class data

**Indexes:** `createdAt` on both tables, `imageId` on Detection.

**Migrations:**
```bash
prisma migrate dev --name init    # Development
prisma migrate deploy             # Production
```

---

## Performance & Scalability

- **Model loading** — Loaded once at startup, shared across requests
- **GPU auto-detect** — Uses CUDA if available, falls back to CPU
- **Image resize** — Large images downscaled before inference (configurable)
- **Database indexes** — On `createdAt` and `imageId` for fast queries
- **Storage abstraction** — `StorageService` class swappable for S3/GCS
- **Static file serving** — Uploads and masks served directly via FastAPI mount
- **Next.js standalone** — Production build outputs minimal deployment bundle

---

## Production Deployment

```bash
# Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend
npm run build
npm start
```

For containerized deployment, add Dockerfiles and use `docker compose` with separate services for frontend, backend, and database.

---

## License

MIT
