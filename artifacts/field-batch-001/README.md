# FIELD–001 physical artifact batch

This directory is the permanent source of truth for the first ten individually traceable Lab Dojo field objects.

- Machine: `SM–001 / Bad Day Receipt`
- Production domain: `https://bad-day-receipt.vercel.app`
- Generated: `2026-07-16T07:39:31Z`
- QR error correction: `Q`
- QR quiet zone: `4 modules`
- Token alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`

## Regenerate without changing tokens

```bash
python -m pip install -r scripts/requirements-field-qr.txt
python scripts/generate-field-qr-batch.py
python scripts/verify-field-qr-batch.py
```

The generator reads `manifest.json`. It never creates or changes tokens. The verifier renders and decodes every SVG and rejects URL mismatches or duplicate destinations.

## Print contract

The Figma production frame is `PRINT / AVERY 10-UP / FIELD–001`.

Export as PDF on US Letter portrait. Print at `100% / Actual Size`; do not use Fit to Page, automatic enlargement, or borderless scaling.
