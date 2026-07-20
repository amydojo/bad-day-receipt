#!/usr/bin/env python3
"""Generate deterministic FIELD batch SVG QR assets from an existing manifest.

Tokens are never generated or mutated here. The manifest is the permanent source of truth.
"""
from __future__ import annotations

import argparse
import io
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

import qrcode
from qrcode.image.svg import SvgPathImage

ALPHABET_PATTERN = re.compile(r"^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$")
CANONICAL_MACHINE_ID = "LD-001"
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "manifest",
        nargs="?",
        type=Path,
        default=Path("artifacts/field-batch-001/manifest.json"),
    )
    return parser.parse_args()


def validate_manifest(rows: object) -> list[dict[str, str]]:
    if not isinstance(rows, list) or len(rows) != 10:
        raise ValueError("Manifest must contain exactly ten field objects.")

    validated: list[dict[str, str]] = []
    seen_tokens: set[str] = set()
    seen_editions: set[str] = set()

    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Every manifest row must be an object.")

        required = {
            "batch",
            "edition",
            "card_name",
            "token",
            "object_type",
            "object_class",
            "url",
            "machine_id",
            "created_at",
        }
        missing = required.difference(row)
        if missing:
            raise ValueError(f"Missing manifest fields: {sorted(missing)}")

        edition = str(row["edition"])
        token = str(row["token"])
        expected_url = f"https://bad-day-receipt.vercel.app/access/{edition}/{token}"

        if edition not in {f"{value:02d}" for value in range(1, 11)}:
            raise ValueError(f"Unexpected edition: {edition}")
        if not ALPHABET_PATTERN.fullmatch(token):
            raise ValueError(f"Invalid physical token: {token}")
        if token in seen_tokens:
            raise ValueError(f"Duplicate token: {token}")
        if edition in seen_editions:
            raise ValueError(f"Duplicate edition: {edition}")
        if row["url"] != expected_url:
            raise ValueError(f"URL mismatch for edition {edition}")
        if row["machine_id"] != CANONICAL_MACHINE_ID:
            raise ValueError(f"Unexpected machine for edition {edition}")

        seen_tokens.add(token)
        seen_editions.add(edition)
        validated.append({key: str(value) for key, value in row.items()})

    return sorted(validated, key=lambda item: item["edition"])


def make_svg(url: str, edition: str, token: str) -> str:
    code = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_Q,
        box_size=10,
        border=4,
    )
    code.add_data(url)
    code.make(fit=True)
    image = code.make_image(image_factory=SvgPathImage)

    buffer = io.BytesIO()
    image.save(buffer)
    root = ET.fromstring(buffer.getvalue())

    title = ET.Element(f"{{{SVG_NS}}}title", {"id": "qr-title"})
    title.text = f"Lab Dojo edition {edition}, token {token} QR"
    description = ET.Element(f"{{{SVG_NS}}}desc", {"id": "qr-desc"})
    description.text = url
    background = ET.Element(
        f"{{{SVG_NS}}}rect",
        {
            "x": "0",
            "y": "0",
            "width": "100%",
            "height": "100%",
            "fill": "#FFFFFF",
        },
    )

    root.insert(0, title)
    root.insert(1, description)
    root.insert(2, background)
    root.set("role", "img")
    root.set("aria-labelledby", "qr-title qr-desc")

    for child in root:
        if child.tag.endswith("path"):
            child.set("fill", "#000000")
            child.set("shape-rendering", "crispEdges")

    return ET.tostring(root, encoding="unicode", xml_declaration=True)


def main() -> None:
    manifest_path = parse_args().manifest
    rows = validate_manifest(json.loads(manifest_path.read_text(encoding="utf-8")))
    output_dir = manifest_path.parent

    for row in rows:
        filename = f"LD-{row['edition']}-{row['token']}.svg"
        output = make_svg(row["url"], row["edition"], row["token"])
        (output_dir / filename).write_text(output, encoding="utf-8")
        print(f"generated {output_dir / filename}")


if __name__ == "__main__":
    main()
