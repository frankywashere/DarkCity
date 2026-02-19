#!/usr/bin/env python3
"""Generate a single sprite frame using the PixelLab create-image-pixflux API."""

import urllib.request
import json
import base64
import sys
import os

API_URL = "https://api.pixellab.ai/v2/create-image-pixflux"
API_KEY = "3888b2ca-8ec3-4560-8352-f8712f3ed85e"
OUTPUT_DIR = "/Users/frank/Desktop/CodingProjects/DarkCity/sprites/generated/characters/murdoch"

BASE_DESC = "full body 2D platformer game character sprite, entire body from head to feet, small figure, man in dark trench coat brown hair, pixel art, side view, transparent background, "

def generate_frame(filename, pose_description, seed=42):
    """Generate a single frame and save it."""
    description = BASE_DESC + pose_description

    payload = {
        "description": description,
        "image_size": {"width": 64, "height": 64},
        "no_background": True,
        "view": "side",
        "outline": "single color black outline",
        "shading": "basic shading",
        "seed": seed
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        },
        method="POST"
    )

    print(f"Generating {filename} with seed={seed}...")
    print(f"Description: {description}")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        img_b64 = result["image"]["base64"]
        img_bytes = base64.b64decode(img_b64)

        output_path = os.path.join(OUTPUT_DIR, filename)
        with open(output_path, "wb") as f:
            f.write(img_bytes)

        print(f"Saved to {output_path} ({len(img_bytes)} bytes)")
        return output_path
    except Exception as e:
        print(f"ERROR: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 generate_frame.py <filename> <pose_description> <seed>")
        sys.exit(1)

    filename = sys.argv[1]
    pose_desc = sys.argv[2]
    seed = int(sys.argv[3])

    generate_frame(filename, pose_desc, seed)
