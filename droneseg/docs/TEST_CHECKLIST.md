# DroneSeg — Test Checklist

## How to Use

- Run each test manually or automate with pytest (backend) / Playwright (frontend)
- Mark status: ✅ Pass | ❌ Fail | ⏭️ Skipped
- Record actual result and notes for failures

---

## 1. Upload Valid Image

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.1 | Upload JPEG | POST `/api/upload/` with valid `.jpg` file | 201, returns `image_id`, `image_url`, `width`, `height`, `size_bytes`, `filename` | |
| 1.2 | Upload PNG | POST `/api/upload/` with valid `.png` file | 201, same response shape | |
| 1.3 | File stored with UUID | Check `uploads/` directory after upload | File saved as `{uuid}.jpg` or `{uuid}.png`, no original filename | |
| 1.4 | Metadata in DB | Query `images` table after upload | Row exists with correct `originalFilename`, `storedFilename`, `width`, `height`, `sizeBytes`, `mimeType` | |
| 1.5 | Image URL accessible | GET the returned `image_url` | 200, serves the uploaded image | |
| 1.6 | Frontend dropzone | Drag valid JPEG into dropzone | Shows filename, dimensions, file size in sidebar | |

---

## 2. Reject Invalid File

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.1 | Wrong extension | Upload `.gif` file | 400, "Invalid file type" | |
| 2.2 | Wrong content-type | Upload file with `Content-Type: application/pdf` | 400, "Invalid content type" | |
| 2.3 | Renamed non-image | Rename `.txt` to `.png` and upload | 422, "File is not a valid image or is corrupted" | |
| 2.4 | Corrupted image | Upload truncated/corrupted JPEG | 422, "File is not a valid image or is corrupted" | |
| 2.5 | No filename | Send multipart with empty filename | 400, "No filename provided" | |
| 2.6 | Path traversal attempt | Upload with filename `../../etc/passwd.png` | File stored as `passwd.png` (sanitized), UUID rename applied | |
| 2.7 | SVG disguised as PNG | Upload SVG with `.png` extension | 400, "Image format 'None' not allowed" (Pillow detects) | |
| 2.8 | Frontend error display | Drop invalid file in UI | Error message shown in red below upload area | |

---

## 3. Reject Large File

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1 | File > 50MB via API | POST with 51MB image | 413, "File exceeds the 50MB size limit" | |
| 3.2 | Middleware rejection | Send request with `Content-Length: 60000000` | 413, rejected before body is read | |
| 3.3 | File exactly 50MB | Upload 50MB file | 201, accepted | |
| 3.4 | Frontend feedback | Attempt large file upload | Error message displayed, no hang | |

---

## 4. Run Segmentation

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.1 | Successful detection | POST `/api/detect/` with valid `image_id` | 200, returns `detection_id`, `image_id`, `model_used`, `inference_time_ms`, `mask_url`, `detections[]` | |
| 4.2 | Each detection has required fields | Inspect response `detections` array | Each item has `label`, `confidence`, `bbox`, `pixel_area`, `color` | |
| 4.3 | Confidence filtering | Set `confidence_threshold: 0.8` | Only detections with confidence ≥ 0.8 returned | |
| 4.4 | Mask file created | Check `results/` directory | `{image_id}_mask.png` exists, valid PNG | |
| 4.5 | Detection saved to DB | Query `detections` table | Row with correct `imageId`, `modelUsed`, `inferenceTimeMs`, `detectionsJson` | |
| 4.6 | Invalid image_id | POST with non-existent UUID | 404, "Image not found" | |
| 4.7 | Model not loaded | Stop model, call detect | 503, "Segmentation model is not loaded" | |
| 4.8 | Large image resize | Upload 4000×3000 image, run detect | Inference completes without OOM, result at original resolution | |
| 4.9 | GPU utilization | Run on GPU machine | Logs show "Using device: cuda", faster inference | |

---

## 5. Display Mask on Map

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.1 | Mask overlay appears | Run detection, check map | Colorized mask visible over drone image | |
| 5.2 | Mask opacity control | Adjust mask opacity slider | Mask transparency changes in real-time | |
| 5.3 | Mask syncs on zoom | Zoom in/out on map | Mask stays aligned with drone image | |
| 5.4 | Mask syncs on pan | Pan the map | Mask moves with image, no offset | |
| 5.5 | Toggle mask off | Set mask opacity to 0% | Mask fully hidden, image visible | |
| 5.6 | Image opacity control | Adjust image opacity slider | Drone image transparency changes | |

---

## 6. Display Bounding Boxes

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.1 | Boxes appear after detection | Run detection | Colored rectangles on map over detected regions | |
| 6.2 | Boxes sync on zoom | Zoom in/out | Boxes scale correctly, stay on correct regions | |
| 6.3 | Boxes sync on pan | Pan the map | Boxes move with image | |
| 6.4 | Class labels shown | Inspect boxes | Each box has text label | |
| 6.5 | Class toggle hides boxes | Uncheck a class in DetectionPanel | Boxes for that class disappear from map | |
| 6.6 | Class toggle shows boxes | Re-check the class | Boxes reappear | |
| 6.7 | Confidence filter updates boxes | Raise confidence threshold | Low-confidence boxes disappear | |
| 6.8 | Box colors match panel | Compare box color to panel swatch | Colors are identical | |

---

## 7. Save History

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.1 | Image appears in history | Upload + detect, navigate to /history | New entry visible in grid | |
| 7.2 | History shows metadata | Check history card | Filename, dimensions, file size, timestamp shown | |
| 7.3 | Detection count shown | Check card for processed image | "N classes detected" label present | |
| 7.4 | Status badge correct | Check unprocessed vs processed | "Pending" vs "Processed" badges | |
| 7.5 | Mask preview on hover | Hover over history card | Mask overlay fades in | |
| 7.6 | Pagination works | Upload 25+ images, check history | Only 20 shown, can load more | |

---

## 8. Reload History Result

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 8.1 | Image detail loads | GET `/api/v1/history/{id}` | Returns image with nested detections array | |
| 8.2 | Original image accessible | GET `/api/v1/history/{id}/file` | Serves original uploaded image | |
| 8.3 | Mask accessible | GET `/api/detect/mask/{detection_id}` | Serves mask PNG | |
| 8.4 | Data persists after restart | Restart backend, query history | All previous records intact | |
| 8.5 | Detection JSON intact | Check `detectionsJson` field | Contains full detections array with all fields | |

---

## 9. Export GeoJSON

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 9.1 | Export returns valid GeoJSON | GET `/api/v1/export/geojson/{detection_id}?min_lng=...` | Valid FeatureCollection with Polygon features | |
| 9.2 | Feature properties correct | Inspect each feature | Has `class`, `confidence`, `pixel_area`, `color`, `detection_id` | |
| 9.3 | Polygon coordinates valid | Check coordinates | Closed ring (5 points), lng/lat within bounds | |
| 9.4 | Missing bounds returns 422 | Call without query params and no DB bounds | 422, "Geographic bounds required" | |
| 9.5 | Frontend download works | Click "Export GeoJSON" button | `.geojson` file downloads | |
| 9.6 | File opens in GIS tool | Open exported file in QGIS/geojson.io | Polygons render correctly | |
| 9.7 | Coordinates match image regions | Compare polygon positions to mask | Polygons align with detected areas | |

---

## 10. API Error Handling

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 10.1 | 404 for missing resource | GET `/api/v1/history/nonexistent-uuid` | 404, JSON error body | |
| 10.2 | 400 for bad request | POST `/api/detect/` with missing `image_id` | 422, validation error | |
| 10.3 | 413 for oversized body | Send > 50MB request | 413, rejected | |
| 10.4 | 503 when model unavailable | Call detect with model unloaded | 503, clear message | |
| 10.5 | 500 returns safe message | Trigger internal error | 500, "Internal server error" (no stack trace) | |
| 10.6 | CORS blocks unauthorized origin | Call from `http://evil.com` | Request blocked by browser | |
| 10.7 | All errors are JSON | Trigger various errors | All responses have `{"detail": "..."}` format | |

---

## 11. Frontend Loading States

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 11.1 | Upload loading | Drop file | Button disabled, no double-submit | |
| 11.2 | Detection loading | Click "Run Segmentation" | Spinner shown, button shows "Processing" | |
| 11.3 | DetectionPanel loading | During inference | Spinner with "Running segmentation..." text | |
| 11.4 | History loading | Navigate to /history | Spinner shown while fetching | |
| 11.5 | Error state clears | Upload new file after error | Previous error message disappears | |
| 11.6 | No flash of stale data | Switch between pages | No previous data shown briefly | |
| 11.7 | Disabled interactions during load | Click buttons during processing | All interactive elements disabled | |

---

## 12. PostgreSQL Persistence

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 12.1 | Image record created | Upload file, query DB | Row in `images` table with all fields populated | |
| 12.2 | Detection record created | Run detection, query DB | Row in `detections` table linked to image | |
| 12.3 | Foreign key integrity | Delete image | Cascade deletes associated detections | |
| 12.4 | UUID primary keys | Check `id` columns | Valid UUIDs, no sequential integers | |
| 12.5 | Timestamps auto-set | Check `createdAt` | Populated with server time | |
| 12.6 | Index performance | Query with 1000+ records | Response < 100ms for list queries | |
| 12.7 | Connection pool | Send 20 concurrent requests | All succeed, no connection errors | |
| 12.8 | Data survives restart | Restart backend + DB | All records intact | |
| 12.9 | Neon serverless wake | Call after 5min idle | Connection re-establishes, query succeeds | |

---

## Test Environment Setup

```bash
# Backend tests
cd backend
pip install pytest pytest-asyncio httpx
pytest tests/ -v

# Frontend tests
cd frontend
npm install -D playwright @playwright/test
npx playwright test

# Load test
pip install locust
locust -f tests/locustfile.py --host http://localhost:8000
```

---

## Automation Priority

| Priority | Tests | Tool |
|----------|-------|------|
| P0 (Critical) | 1.1, 2.1–2.4, 3.1, 4.1, 4.6, 10.1–10.5, 12.1–12.3 | pytest + httpx |
| P1 (High) | 4.2–4.5, 7.1, 8.1–8.3, 9.1–9.3 | pytest + httpx |
| P2 (Medium) | 5.1–5.6, 6.1–6.8, 11.1–11.7 | Playwright |
| P3 (Low) | 6.8, 7.5, 9.6, 12.6–12.9 | Manual / Locust |
