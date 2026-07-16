#!/usr/bin/env python3
"""Decode every FIELD batch SVG and verify it matches the manifest URL."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cairosvg
import cv2
import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "manifest",
        nargs="?",
        type=Path,
        default=Path("artifacts/field-batch-001/manifest.json"),
    )
    return parser.parse_args()


def main() -> None:
    manifest_path = parse_args().manifest
    rows = json.loads(manifest_path.read_text(encoding="utf-8"))
    detector = cv2.QRCodeDetector()
    destinations: set[str] = set()

    for row in rows:
        svg_path = manifest_path.parent / f"LD-{row['edition']}-{row['token']}.svg"
        png = cairosvg.svg2png(
            bytestring=svg_path.read_bytes(),
            output_width=900,
            output_height=900,
        )
        image = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_COLOR)
        decoded, points, _ = detector.detectAndDecode(image)
        if points is None or decoded != row["url"]:
            raise SystemExit(
                f"QR validation failed for edition {row['edition']}: {decoded!r}"
            )
        if decoded in destinations:
            raise SystemExit(f"Duplicate QR destination: {decoded}")
        destinations.add(decoded)
        print(f"verified {row['edition']} {row['token']} -> {decoded}")

    if len(destinations) != 10:
        raise SystemExit("Expected ten distinct QR destinations.")


if __name__ == "__main__":
    main()
