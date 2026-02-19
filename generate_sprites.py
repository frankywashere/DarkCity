#!/usr/bin/env python3
"""
Generate all Dark City: The Awakening sprites via PixelLab API.

Generates characters, tiles, backgrounds, UI elements, and effects
using the PixelLab v2 API endpoints:
  - create-image-pixflux: single images (tiles, backgrounds, UI, effects, character bases)
  - animate-with-text: character animation frames (64x64 only)

All output is saved to sprites/generated/ organized by type.
"""

import urllib.request
import urllib.error
import json
import base64
import os
import time
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_KEY = "3888b2ca-8ec3-4560-8352-f8712f3ed85e"
BASE_URL = "https://api.pixellab.ai/v2"
PROJECT_DIR = Path("/Users/frank/Desktop/CodingProjects/DarkCity")
OUTPUT_DIR = PROJECT_DIR / "sprites" / "generated"
REFERENCE_IMAGE_PATH = PROJECT_DIR / "sprites" / "pixellab_test" / "character_base.png"

# Subdirectories
CHAR_DIR = OUTPUT_DIR / "characters"
TILE_DIR = OUTPUT_DIR / "tiles"
BG_DIR = OUTPUT_DIR / "backgrounds"
UI_DIR = OUTPUT_DIR / "ui"
FX_DIR = OUTPUT_DIR / "effects"

# Timing
API_DELAY = 1.0          # seconds between API calls
MAX_RETRIES = 4           # max retry attempts on failure
INITIAL_BACKOFF = 2.0     # initial backoff in seconds for retries

# Tracking
generation_count = 0
success_count = 0
fail_count = 0
results_log = []  # list of (name, status, path_or_error)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def ensure_dirs():
    """Create all output directories."""
    for d in [CHAR_DIR, TILE_DIR, BG_DIR, UI_DIR, FX_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    print(f"Output directories ready under {OUTPUT_DIR}")


def load_image_as_base64(path: Path) -> str:
    """Read an image file and return its base64-encoded string."""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def save_image_from_base64(b64_data: str, path: Path):
    """Decode a base64 string and write it as a PNG file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(base64.b64decode(b64_data))


def make_base64_obj(b64_data: str) -> dict:
    """Return the PixelLab base64 image object."""
    return {"type": "base64", "base64": b64_data, "format": "png"}


def api_call(endpoint: str, payload: dict) -> dict:
    """
    Make a POST request to the PixelLab API with retry + exponential backoff.
    Returns the parsed JSON response dict.
    """
    global generation_count
    url = f"{BASE_URL}/{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }

    backoff = INITIAL_BACKOFF
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = resp.read()
                generation_count += 1
                return json.loads(body)
        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            if e.code == 429:
                wait = backoff * (2 ** (attempt - 1))
                print(f"    Rate limited (429). Retrying in {wait:.0f}s (attempt {attempt}/{MAX_RETRIES})...")
                time.sleep(wait)
                continue
            elif e.code >= 500 and attempt < MAX_RETRIES:
                wait = backoff * (2 ** (attempt - 1))
                print(f"    Server error ({e.code}). Retrying in {wait:.0f}s (attempt {attempt}/{MAX_RETRIES})...")
                time.sleep(wait)
                continue
            else:
                raise RuntimeError(
                    f"HTTP {e.code} from {endpoint}: {error_body[:500]}"
                ) from e
        except urllib.error.URLError as e:
            if attempt < MAX_RETRIES:
                wait = backoff * (2 ** (attempt - 1))
                print(f"    Connection error. Retrying in {wait:.0f}s (attempt {attempt}/{MAX_RETRIES})...")
                time.sleep(wait)
                continue
            raise RuntimeError(f"Connection failed after {MAX_RETRIES} attempts: {e}") from e

    raise RuntimeError(f"Failed after {MAX_RETRIES} retries for {endpoint}")


def log_result(name: str, status: str, detail: str = ""):
    """Log a generation result."""
    global success_count, fail_count
    if status == "OK":
        success_count += 1
    else:
        fail_count += 1
    results_log.append((name, status, detail))


# ---------------------------------------------------------------------------
# Generation: Single image via create-image-pixflux
# ---------------------------------------------------------------------------
def generate_single_image(
    description: str,
    width: int,
    height: int,
    save_path: Path,
    name: str,
    no_background: bool = False,
    view: str = None,
    outline: str = None,
    shading: str = None,
    seed: int = None,
):
    """Generate a single image and save it."""
    print(f"  Generating: {name} ({width}x{height})...")

    payload = {
        "description": description,
        "image_size": {"width": width, "height": height},
        "no_background": no_background,
    }
    if view:
        payload["view"] = view
    if outline:
        payload["outline"] = outline
    if shading:
        payload["shading"] = shading
    if seed is not None:
        payload["seed"] = seed

    try:
        resp = api_call("create-image-pixflux", payload)
        b64 = resp["image"]["base64"]
        save_image_from_base64(b64, save_path)
        print(f"    -> Saved: {save_path.relative_to(PROJECT_DIR)}")
        log_result(name, "OK", str(save_path))
        time.sleep(API_DELAY)
        return b64
    except Exception as e:
        print(f"    !! FAILED: {e}")
        log_result(name, "FAIL", str(e))
        time.sleep(API_DELAY)
        return None


# ---------------------------------------------------------------------------
# Generation: Animation frames via animate-with-text
# ---------------------------------------------------------------------------
def generate_animation(
    description: str,
    action: str,
    reference_b64: str,
    n_frames: int,
    save_dir: Path,
    anim_name: str,
    char_name: str,
    direction: str = "east",
    seed: int = None,
):
    """Generate animation frames for a character and save them."""
    label = f"{char_name}/{anim_name}"
    print(f"  Generating animation: {label} ({n_frames} frames)...")

    payload = {
        "image_size": {"width": 64, "height": 64},
        "description": description,
        "action": action,
        "reference_image": make_base64_obj(reference_b64),
        "n_frames": n_frames,
        "direction": direction,
        "text_guidance_scale": 6,
        "image_guidance_scale": 4.0,
    }
    if seed is not None:
        payload["seed"] = seed

    try:
        resp = api_call("animate-with-text", payload)
        images = resp["images"]
        saved_paths = []
        for i, img in enumerate(images):
            frame_path = save_dir / f"{anim_name}_{i:02d}.png"
            save_image_from_base64(img["base64"], frame_path)
            saved_paths.append(str(frame_path.relative_to(PROJECT_DIR)))
        print(f"    -> Saved {len(images)} frames to {save_dir.relative_to(PROJECT_DIR)}/")
        log_result(label, "OK", f"{len(images)} frames")
        time.sleep(API_DELAY)
        return True
    except Exception as e:
        print(f"    !! FAILED: {e}")
        log_result(label, "FAIL", str(e))
        time.sleep(API_DELAY)
        return False


# ---------------------------------------------------------------------------
# Character definitions
# ---------------------------------------------------------------------------
CHARACTERS = [
    {
        "name": "murdoch",
        "description": (
            "full body 2D side-scrolling platformer game character sprite, "
            "entire body visible from head to feet, small figure in frame, "
            "man wearing dark trench coat, brown hair, noir detective, "
            "pixel art, side view profile, transparent background"
        ),
        "animations": [
            ("idle", "full body character standing idle, arms at sides, entire body head to feet visible", 2),
            ("walk", "full body character walking, legs in stride, entire body head to feet visible", 2),
            ("run", "full body character running fast, legs in stride, entire body head to feet visible", 2),
            ("jump", "full body character jumping upward, legs bent, entire body head to feet visible", 2),
            ("fall", "full body character falling, legs dangling, entire body head to feet visible", 2),
            ("crouch", "full body character crouching low, knees bent, entire body head to feet visible", 2),
            ("punch", "full body character punching forward with fist, entire body head to feet visible", 2),
            ("kick", "full body character kicking with leg extended, entire body head to feet visible", 2),
            ("sword_slash", "full body character slashing sword, entire body head to feet visible", 2),
            ("tuning_activate", "full body character with glowing blue energy hands, entire body head to feet visible", 2),
            ("hurt", "full body character recoiling in pain, entire body head to feet visible", 2),
            ("death", "full body character collapsing to ground, entire body head to feet visible", 2),
        ],
    },
    {
        "name": "stranger_grunt",
        "description": (
            "full body 2D side-scrolling platformer game character sprite, "
            "entire body visible from head to feet, small figure in frame, "
            "pale bald man in long black leather coat, sinister villain, "
            "pixel art, side view profile, transparent background"
        ),
        "animations": [
            ("idle", "full body character standing menacingly, entire body head to feet visible", 2),
            ("walk", "full body character walking forward, legs moving, entire body head to feet visible", 2),
            ("attack", "full body character lunging to attack with claws, entire body head to feet visible", 2),
            ("hurt", "full body character recoiling from damage, entire body head to feet visible", 2),
            ("death", "full body character dissolving into shadows, entire body head to feet visible", 2),
        ],
    },
    {
        "name": "mr_sleep",
        "description": (
            "full body 2D side-scrolling platformer game character sprite, "
            "entire body visible from head to feet, small figure in frame, "
            "pale bald thin man in black coat, sharp teeth, creepy, "
            "pixel art, side view profile, transparent background"
        ),
        "animations": [
            ("idle", "full body character standing with creepy smile, entire body head to feet visible", 2),
            ("move", "full body character gliding forward eerily, entire body head to feet visible", 2),
            ("teleport_in", "full body character materializing from darkness, entire body head to feet visible", 2),
            ("teleport_out", "full body character vanishing into darkness, entire body head to feet visible", 2),
            ("lunge", "full body character lunging forward with claws, entire body head to feet visible", 2),
            ("death", "full body character crumbling and dissolving, entire body head to feet visible", 2),
        ],
    },
    {
        "name": "mr_wall",
        "description": (
            "full body 2D side-scrolling platformer game character sprite, "
            "entire body visible from head to feet, small figure in frame, "
            "large muscular pale bald man in black coat, intimidating, "
            "pixel art, side view profile, transparent background"
        ),
        "animations": [
            ("idle", "full body character standing with arms crossed, entire body head to feet visible", 2),
            ("walk", "full body character walking heavily, entire body head to feet visible", 2),
            ("charge", "full body character charging forward, entire body head to feet visible", 2),
            ("hurt", "full body character flinching from hit, entire body head to feet visible", 2),
            ("death", "full body character falling forward crashing, entire body head to feet visible", 2),
        ],
    },
    {
        "name": "mr_hand",
        "description": (
            "full body 2D side-scrolling platformer game character sprite, "
            "entire body visible from head to feet, small figure in frame, "
            "pale bald man in dark coat, calculating villain, "
            "pixel art, side view profile, transparent background"
        ),
        "animations": [
            ("idle", "full body character standing with hands behind back, entire body head to feet visible", 2),
            ("walk", "full body character walking with purpose, entire body head to feet visible", 2),
            ("punch", "full body character striking with telekinetic punch, entire body head to feet visible", 2),
            ("tuning_attack", "full body character projecting dark energy wave, entire body head to feet visible", 2),
            ("death", "full body character staggering and collapsing, entire body head to feet visible", 2),
        ],
    },
    {
        "name": "mr_book",
        "description": (
            "full body 2D side-scrolling platformer game character sprite, "
            "entire body visible from head to feet, small figure in frame, "
            "pale bald man in ornate black coat, hovering villain leader, "
            "pixel art, side view profile, transparent background"
        ),
        "animations": [
            ("hover_idle", "full body character hovering with dark energy, entire body head to feet visible", 2),
            ("telekinesis", "full body character raising hands with telekinesis, entire body head to feet visible", 2),
            ("summon", "full body character summoning dark portals, entire body head to feet visible", 2),
            ("slam", "full body character slamming hands creating shockwave, entire body head to feet visible", 2),
            ("death", "full body character exploding with energy, entire body head to feet visible", 2),
        ],
    },
]


# ---------------------------------------------------------------------------
# Tile definitions
# ---------------------------------------------------------------------------
TILES = [
    # City tileset
    {
        "name": "city_ground",
        "desc": "pixel art dark city street ground tile, asphalt, cracks, noir style, dark blues and grays, seamless",
        "w": 32, "h": 32, "nobg": False,
    },
    {
        "name": "city_wall",
        "desc": "pixel art dark city brick wall tile, gritty, noir, dark blues and grays, seamless",
        "w": 32, "h": 32, "nobg": False,
    },
    {
        "name": "city_window",
        "desc": "pixel art dark city building wall with lit window, warm light, noir, dark blues, seamless",
        "w": 32, "h": 32, "nobg": False,
    },
    {
        "name": "city_platform",
        "desc": "pixel art floating platform, dark metal ledge, side view, noir style",
        "w": 32, "h": 32, "nobg": True,
    },
    # Underground tileset
    {
        "name": "underground_ground",
        "desc": "pixel art gothic underground stone floor tile, dark greens and bronze, seamless",
        "w": 32, "h": 32, "nobg": False,
    },
    {
        "name": "underground_wall",
        "desc": "pixel art gothic underground stone wall tile, moss, dark greens and bronze, seamless",
        "w": 32, "h": 32, "nobg": False,
    },
    {
        "name": "underground_platform",
        "desc": "pixel art floating stone platform, gothic, dark greens, side view",
        "w": 32, "h": 32, "nobg": True,
    },
    # Lair tileset
    {
        "name": "lair_ground",
        "desc": "pixel art alien machine room floor tile, metal grates, dark purples and electric blues, seamless",
        "w": 32, "h": 32, "nobg": False,
    },
    {
        "name": "lair_wall",
        "desc": "pixel art alien machine room wall tile, circuits, dark purples and electric blues, seamless",
        "w": 32, "h": 32, "nobg": False,
    },
    {
        "name": "lair_platform",
        "desc": "pixel art floating alien platform, electric blue glow, side view",
        "w": 32, "h": 32, "nobg": True,
    },
]


# ---------------------------------------------------------------------------
# Background definitions (400x225 to stay within 400px max dimension)
# ---------------------------------------------------------------------------
BACKGROUNDS = [
    {
        "name": "bg_city_far",
        "desc": "pixel art distant dark city skyline at night, tall skyscrapers, noir, moody, stars, parallax background layer",
        "w": 400, "h": 225,
    },
    {
        "name": "bg_city_mid",
        "desc": "pixel art mid-distance dark buildings with lit windows, fire escapes, noir night scene, parallax background",
        "w": 400, "h": 225,
    },
    {
        "name": "bg_underground",
        "desc": "pixel art underground lair entrance, gothic stone columns, arches, dim green torchlight, dark atmosphere",
        "w": 400, "h": 225,
    },
    {
        "name": "bg_lair",
        "desc": "pixel art alien machine room background, dark purple walls, glowing circuits, electric blue machinery, sci-fi",
        "w": 400, "h": 225,
    },
    {
        "name": "bg_boss_arena",
        "desc": "pixel art open arena with dark city skyline backdrop, dramatic lighting, rain, noir, boss fight arena",
        "w": 400, "h": 225,
    },
    {
        "name": "bg_shell_beach",
        "desc": "pixel art sunrise over calm ocean with wooden pier, warm golden colors, peaceful, dawn, beautiful",
        "w": 400, "h": 225,
    },
]


# ---------------------------------------------------------------------------
# UI definitions
# ---------------------------------------------------------------------------
UI_ELEMENTS = [
    {
        "name": "menu_background",
        "desc": "pixel art dark city noir title screen background, moody skyline, dramatic spotlight, rain, game menu",
        "w": 400, "h": 225,
        "nobg": False,
    },
    {
        "name": "portrait_murdoch",
        "desc": "pixel art portrait of man with brown hair and determined expression, dark trench coat, noir style, face closeup",
        "w": 48, "h": 48,
        "nobg": True,
    },
]


# ---------------------------------------------------------------------------
# Effects definitions
# ---------------------------------------------------------------------------
EFFECTS = [
    {
        "name": "tuning_glow",
        "desc": "pixel art blue energy wisp particles, glowing, magical, ethereal, transparent, dark background",
        "w": 32, "h": 32,
        "nobg": True,
    },
    {
        "name": "impact_sparks",
        "desc": "pixel art white and yellow impact sparks, hit effect, burst, combat, transparent",
        "w": 32, "h": 32,
        "nobg": True,
    },
    {
        "name": "dark_energy",
        "desc": "pixel art dark purple energy swirl, evil power, stranger tuning, transparent",
        "w": 32, "h": 32,
        "nobg": True,
    },
    {
        "name": "heal_particles",
        "desc": "pixel art blue and white healing particles, rising upward, soft glow, transparent, ethereal",
        "w": 32, "h": 32,
        "nobg": True,
    },
]


# ---------------------------------------------------------------------------
# Main generation pipeline
# ---------------------------------------------------------------------------
def generate_characters():
    """Generate all character base sprites and animations."""
    print("\n" + "=" * 60)
    print("PHASE 1: CHARACTER GENERATION")
    print("=" * 60)

    # Load the existing reference image for consistency bootstrap
    ref_b64 = load_image_as_base64(REFERENCE_IMAGE_PATH)
    print(f"Loaded reference image from {REFERENCE_IMAGE_PATH.name}")

    for char in CHARACTERS:
        char_name = char["name"]
        char_desc = char["description"]
        char_dir = CHAR_DIR / char_name
        char_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n--- Character: {char_name} ---")

        # Step 1: Generate a base/reference image for this character
        base_path = char_dir / "base.png"
        base_b64 = generate_single_image(
            description=char_desc,
            width=64,
            height=64,
            save_path=base_path,
            name=f"{char_name}/base",
            no_background=True,
            view="side",
            outline="single color black outline",
            shading="basic shading",
            seed=42,
        )

        if base_b64 is None:
            # Fall back to existing reference if base generation fails
            print(f"    Using fallback reference image for {char_name}")
            base_b64 = ref_b64

        # Step 2: Generate each animation using the base as reference
        for anim_name, action, n_frames in char["animations"]:
            generate_animation(
                description=char_desc,
                action=action,
                reference_b64=base_b64,
                n_frames=n_frames,
                save_dir=char_dir,
                anim_name=anim_name,
                char_name=char_name,
                direction="east",
                seed=42,
            )


def generate_tiles():
    """Generate all tile sprites."""
    print("\n" + "=" * 60)
    print("PHASE 2: TILE GENERATION")
    print("=" * 60)

    for tile in TILES:
        save_path = TILE_DIR / f"{tile['name']}.png"
        generate_single_image(
            description=tile["desc"],
            width=tile["w"],
            height=tile["h"],
            save_path=save_path,
            name=f"tile/{tile['name']}",
            no_background=tile.get("nobg", False),
            view="side",
            outline="single color black outline",
            shading="basic shading",
        )


def generate_backgrounds():
    """Generate all background images."""
    print("\n" + "=" * 60)
    print("PHASE 3: BACKGROUND GENERATION")
    print("=" * 60)

    for bg in BACKGROUNDS:
        save_path = BG_DIR / f"{bg['name']}.png"
        generate_single_image(
            description=bg["desc"],
            width=bg["w"],
            height=bg["h"],
            save_path=save_path,
            name=f"bg/{bg['name']}",
            no_background=False,
            view="side",
            shading="detailed shading",
        )


def generate_ui():
    """Generate UI elements."""
    print("\n" + "=" * 60)
    print("PHASE 4: UI GENERATION")
    print("=" * 60)

    for ui in UI_ELEMENTS:
        save_path = UI_DIR / f"{ui['name']}.png"
        generate_single_image(
            description=ui["desc"],
            width=ui["w"],
            height=ui["h"],
            save_path=save_path,
            name=f"ui/{ui['name']}",
            no_background=ui.get("nobg", False),
            shading="detailed shading",
        )


def generate_effects():
    """Generate effect sprites."""
    print("\n" + "=" * 60)
    print("PHASE 5: EFFECTS GENERATION")
    print("=" * 60)

    for fx in EFFECTS:
        save_path = FX_DIR / f"{fx['name']}.png"
        generate_single_image(
            description=fx["desc"],
            width=fx["w"],
            height=fx["h"],
            save_path=save_path,
            name=f"fx/{fx['name']}",
            no_background=fx.get("nobg", True),
            view="side",
            shading="basic shading",
        )


def print_summary():
    """Print a summary of all generation results."""
    print("\n" + "=" * 60)
    print("GENERATION SUMMARY")
    print("=" * 60)
    print(f"Total API calls made:  {generation_count}")
    print(f"Successful:            {success_count}")
    print(f"Failed:                {fail_count}")
    print()

    # Print successes
    successes = [(n, d) for n, s, d in results_log if s == "OK"]
    if successes:
        print(f"--- Successes ({len(successes)}) ---")
        for name, detail in successes:
            print(f"  [OK] {name}: {detail}")

    # Print failures
    failures = [(n, d) for n, s, d in results_log if s == "FAIL"]
    if failures:
        print(f"\n--- Failures ({len(failures)}) ---")
        for name, detail in failures:
            print(f"  [FAIL] {name}: {detail}")

    print()
    estimated_total = count_expected_generations()
    print(f"Expected generation count: ~{estimated_total}")
    print(f"Actual API calls:          {generation_count}")


def count_expected_generations():
    """Count expected number of API calls."""
    total = 0
    # Character bases
    total += len(CHARACTERS)
    # Character animations
    for char in CHARACTERS:
        total += len(char["animations"])
    # Tiles
    total += len(TILES)
    # Backgrounds
    total += len(BACKGROUNDS)
    # UI
    total += len(UI_ELEMENTS)
    # Effects
    total += len(EFFECTS)
    return total


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("Dark City: The Awakening - Sprite Generator")
    print("=" * 60)
    print(f"API Base URL: {BASE_URL}")
    print(f"Output dir:   {OUTPUT_DIR}")

    # Parse command-line flags
    characters_only = "--characters-only" in sys.argv
    effects_only = "--effects-only" in sys.argv

    expected = count_expected_generations()
    print(f"Expected API calls: ~{expected}")
    print()

    ensure_dirs()

    start_time = time.time()

    if characters_only:
        print("*** Running CHARACTERS ONLY ***")
        generate_characters()
    elif effects_only:
        print("*** Running EFFECTS ONLY ***")
        generate_effects()
    else:
        # Phase 1: Characters (most important, takes most calls)
        generate_characters()

        # Phase 2: Tiles
        generate_tiles()

        # Phase 3: Backgrounds
        generate_backgrounds()

        # Phase 4: UI
        generate_ui()

        # Phase 5: Effects
        generate_effects()

    elapsed = time.time() - start_time
    print(f"\nTotal time: {elapsed:.1f}s ({elapsed / 60:.1f} minutes)")

    print_summary()


if __name__ == "__main__":
    main()
