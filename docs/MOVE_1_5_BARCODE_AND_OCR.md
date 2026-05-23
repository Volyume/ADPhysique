# Move #1.5: Barcode + OCR (locked)

Adds barcode scanning, live OpenFoodFacts and USDA APIs, and the
OCR write-back loop to OFF. Locked 2026-05-23.

## Why this is a separate move

Move #1 already bundles substantial work (schema + UI + FFM floor).
Adding camera + MLKit + OCR + write-back doubles the surface area.
Shipping separately lets us:

- Validate the food schema and engine integration with manual entry
  first.
- Ship barcode scanning into a stable foundation rather than
  alongside the foundation.
- Keep CI build size manageable; vision-camera + MLKit add ~30MB to
  the app.

## Scope

### Dependencies

```
react-native-vision-camera ~4.x
@sentry/react-native-mlkit (or equivalent MLKit binding)
react-native-vision-camera-mlkit-text-recognition
```

Added to `package.json` and `package-lock.json`.

### Permissions

- iOS: NSCameraUsageDescription added to Info.plist with locked
  copy: "Volyume uses the camera to scan barcodes and read
  nutrition labels."
- Android: CAMERA permission added to AndroidManifest.xml.

### Code

```
src/lib/food/waterfall.js                 EXTENDED with steps 4-5 (live OFF, USDA)
src/lib/food/sources/
  liveOff.js                              NEW
  usda.js                                 NEW
src/lib/food/normalisers/
  usdaToFood.js                           NEW
src/lib/food/ocr.js                       NEW
src/lib/food/writeback.js                 NEW (OFF contribution flow)

src/screens/ScanBarcodeScreen.js          NEW
src/screens/ScanLabelScreen.js            NEW (OCR fallback)
src/screens/AddCustomFoodScreen.js        EXTENDED (OCR prefill path)
```

### UI changes

- New floating "Scan" button on Diary tab (camera icon, bottom-
  right).
- New "Scan" entry in the Search toolbar.
- "Couldn't find this product" sheet (already wired in move #1)
  now has working "Snap the nutrition label" CTA.

### Telemetry additions

```
food_lookup_barcode
ocr_writeback_attempted
```

### Performance targets

- Cold scan -> add sheet (cache hit): under 250ms.
- Cold scan -> add sheet (live OFF): under 1500ms.
- OCR parse: under 800ms on mid-range hardware.

## OFF contribution flow

User-consent gated. Copy locked in
`FOOD_DATA_STRATEGY_LOCKED.md`:

> "Found this one yourself? You can share it with Open Food Facts
> so the next Volyume user gets a hit instead of a miss. We only
> send the label photo and the macros you confirmed. Off by default."

Toggle off by default. If user toggles on, the OCR write-back queue
runs in the background (within 30s of the user saving the custom
food) and POSTs to OFF's contribution API. Failures retry up to 3
times with exponential backoff; permanent failures are logged and
do not surface to the user.

OFF API rate limits and rules respected: 1 API call per real user
action; no scraping; respect their cache headers.

## USDA setup

- API key obtained from api.data.gov (free, 30-second signup).
- Stored as GitHub secret `USDA_FOODDATA_API_KEY`.
- Wired into the build via `EXPO_PUBLIC_USDA_API_KEY` (it's not
  truly secret; the API enforces per-key rate limits not exclusivity).

## Tests required

### Unit

- `tests/food/sources/liveOff.test.js` (with API mocks)
- `tests/food/sources/usda.test.js` (with API mocks)
- `tests/food/normalisers/usdaToFood.test.js`
- `tests/food/ocr.test.js` (with sample label images as fixtures)
- `tests/food/writeback.test.js`

### Integration

- `tests/food/waterfall.test.js` (full waterfall, all sources)

### E2E (Maestro)

- `e2e/scan_barcode_happy_path.yaml`: scan a known UK product,
  verify add sheet appears.
- `e2e/scan_barcode_miss_ocr.yaml`: scan an unknown product, run
  OCR, verify prefilled custom food form.
- `e2e/ocr_writeback_consent.yaml`: verify OFF write-back is OFF
  by default and on tap actually fires.

## Acceptance check

- Scanning a Tesco Finest sourdough barcode lands the user on the
  food detail sheet within 1.5s.
- Scanning an obscure UK product (no OFF entry) lands on the
  "couldn't find" sheet.
- Tapping "Snap the nutrition label" opens the camera, captures a
  label, parses macros within 800ms.
- Confirming the custom food saves it locally and (with consent)
  queues an OFF write-back.
- An OFF write-back POST is observed via a fixture-mock server.
- UK barcode benchmark: 200 supermarket products scanned, hit rate
  at least 85%.
- Permissions copy on iOS and Android matches the locked string.
- Cold scan to cache hit consistently under 250ms.

## Out of scope at this move

- AI photo logging (still out, possibly out forever).
- Recipe URL importer (v1.1).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Vision-camera MLKit issues on specific Android devices | Test matrix includes Samsung A53, Pixel 6, OnePlus Nord; fallback to manual entry |
| OCR misreads macros | Sanity-check pass already in custom food (from move #1) catches gross errors; user always confirms |
| OFF API rate limits hit on a viral day | Bundled snapshot already covers most lookups; live API is a fallback. Implement client-side debounce. |
| USDA API key abuse (low rate limit) | Per-user throttle to 60 calls/hour; cache aggressively |
| App size jump from MLKit binary | Acceptable trade-off; barcode is core to the value proposition |
