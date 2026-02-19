#!/usr/bin/env python3
"""
Generate pixel art cutscene illustrations for Dark City using PixelLab API.
Generates 9 illustrations across 3 cutscenes (3 each).
"""

import requests
import base64
import os
import time

API_URL = "https://api.pixellab.ai/v2/create-image-pixflux"
API_KEY = "3888b2ca-8ec3-4560-8352-f8712f3ed85e"
OUTPUT_DIR = "/Users/frank/Desktop/CodingProjects/DarkCity/assets/cutscenes"

ILLUSTRATIONS = [
    # Cutscene 1: THE AWAKENING
    {
        "filename": "cutscene_awakening_1.png",
        "description": "Dark hotel bathroom with old porcelain bathtub filled with murky water, dim yellow light from a single bulb, cracked tile walls, noir atmosphere, steam rising, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    {
        "filename": "cutscene_awakening_2.png",
        "description": "Dark hotel room at night, old rotary phone ringing on nightstand with glowing dial, shadowy body lying on the floor, moonlight through venetian blinds casting striped shadows, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    {
        "filename": "cutscene_awakening_3.png",
        "description": "Long dark city corridor with Art Deco walls, shadowy figures with pale faces approaching from the far end, flickering overhead lights, fog rolling along the floor, ominous atmosphere, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    # Cutscene 2: THE TRUTH
    {
        "filename": "cutscene_truth_1.png",
        "description": "Man in dark coat with glowing bright blue energy emanating from his outstretched hands, brick wall cracking and reshaping around him, blue particles floating, underground setting, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    {
        "filename": "cutscene_truth_2.png",
        "description": "Massive gothic stone archway entrance to underground passage, carved alien symbols on the stone, stairs descending into deep darkness, faint blue-purple glow from below, abandoned city street above, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    {
        "filename": "cutscene_truth_3.png",
        "description": "Dark city skyline at midnight, buildings impossibly warping and reshaping themselves, bending like liquid, surreal dreamlike architecture, clock tower striking twelve, stars swirling in the sky, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    # Cutscene 3: THE INJECTION
    {
        "filename": "cutscene_injection_1.png",
        "description": "Man strapped to a large alien biomechanical machine with tubes and wires, underground lair with dark purple and blue lighting, strange apparatus surrounding him, sinister laboratory setting, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    {
        "filename": "cutscene_injection_2.png",
        "description": "Massive explosion of bright blue psychic energy, metal restraints shattering into pieces, man at the center with arms outstretched, shockwave rippling outward, underground chamber cracking, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
    {
        "filename": "cutscene_injection_3.png",
        "description": "Man floating high above a dark city with immense glowing electric blue aura surrounding his body, arms spread wide, buildings far below, night sky with swirling energy, godlike power radiating, pixel art, dark noir atmosphere, cinematic, moody lighting"
    },
]

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}


def generate_image(desc, filename):
    payload = {
        "description": desc,
        "image_size": {"width": 400, "height": 225},
        "no_background": False,
        "shading": "detailed shading"
    }

    print(f"  Generating {filename}...")
    resp = requests.post(API_URL, json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    data = resp.json()

    image_b64 = data["image"]["base64"]
    image_bytes = base64.b64decode(image_b64)

    output_path = os.path.join(OUTPUT_DIR, filename)
    with open(output_path, "wb") as f:
        f.write(image_bytes)

    file_size = os.path.getsize(output_path)
    print(f"  Saved {filename} ({file_size:,} bytes)")
    return output_path


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Generating {len(ILLUSTRATIONS)} cutscene illustrations...")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    for i, illust in enumerate(ILLUSTRATIONS):
        print(f"[{i+1}/{len(ILLUSTRATIONS)}] {illust['filename']}")
        try:
            generate_image(illust["description"], illust["filename"])
        except Exception as e:
            print(f"  ERROR: {e}")
        # Small delay between requests to be polite to the API
        if i < len(ILLUSTRATIONS) - 1:
            time.sleep(1)
        print()

    # Verify all files
    print("=" * 60)
    print("Verification:")
    all_ok = True
    for illust in ILLUSTRATIONS:
        path = os.path.join(OUTPUT_DIR, illust["filename"])
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  OK: {illust['filename']} ({size:,} bytes)")
        else:
            print(f"  MISSING: {illust['filename']}")
            all_ok = False

    if all_ok:
        print("\nAll 9 illustrations generated successfully!")
    else:
        print("\nSome illustrations are missing. Check errors above.")


if __name__ == "__main__":
    main()
