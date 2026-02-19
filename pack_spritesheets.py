#!/usr/bin/env python3
"""
Pack individual sprite frames into sprite sheets for Dark City.
Reads frames from sprites/generated/characters/ directory and assembles
into sheet PNGs in assets/sprites/. Also copies tiles, backgrounds, and
UI elements from sprites/generated/ to appropriate asset directories.
"""
from pathlib import Path
import json
import shutil

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip install Pillow")
    exit(1)

FRAME_SIZE = 64  # 64x64 pixel art
GENERATED_DIR = Path("sprites/generated")
CHARACTERS_DIR = GENERATED_DIR / "characters"
OUTPUT_SPRITES = Path("assets/sprites")
OUTPUT_TILES = Path("assets/tiles")
OUTPUT_BACKGROUNDS = Path("assets/backgrounds")
OUTPUT_UI = Path("assets/ui")
OUTPUT_EFFECTS = Path("assets/effects")

# Ensure output directories exist
for d in [OUTPUT_SPRITES, OUTPUT_TILES, OUTPUT_BACKGROUNDS, OUTPUT_UI, OUTPUT_EFFECTS]:
    d.mkdir(parents=True, exist_ok=True)

# Character sheet definitions: character name -> list of (anim_name, frame_rate)
SHEET_DEFINITIONS = {
    "murdoch": [
        ("idle", 6),
        ("walk", 8),
        ("run", 10),
        ("jump", 8),
        ("fall", 6),
        ("crouch", 4),
        ("punch", 12),
        ("kick", 12),
        ("sword_slash", 10),
        ("tuning_activate", 8),
        ("hurt", 8),
        ("death", 6),
    ],
    "stranger_grunt": [
        ("idle", 6),
        ("walk", 8),
        ("attack", 10),
        ("hurt", 8),
        ("death", 6),
    ],
    "mr_sleep": [
        ("idle", 6),
        ("move", 8),
        ("teleport_in", 10),
        ("teleport_out", 10),
        ("lunge", 12),
        ("death", 6),
    ],
    "mr_wall": [
        ("idle", 6),
        ("walk", 8),
        ("charge", 10),
        ("hurt", 8),
        ("death", 6),
    ],
    "mr_hand": [
        ("idle", 6),
        ("walk", 8),
        ("punch", 12),
        ("tuning_attack", 8),
        ("death", 6),
    ],
    "mr_book": [
        ("hover_idle", 6),
        ("telekinesis", 8),
        ("summon", 10),
        ("slam", 12),
        ("death", 6),
    ],
}


def find_anim_frames(character: str, anim_name: str) -> list[Path]:
    """
    Find all frames for a specific character animation.
    Looks for patterns like:
      sprites/generated/characters/murdoch/idle_00.png
      sprites/generated/characters/murdoch/idle_01.png
      ...
    Also tries: murdoch_idle_00.png in the character folder.
    """
    char_dir = CHARACTERS_DIR / character
    if not char_dir.exists():
        return []

    # Try pattern: anim_00.png, anim_01.png, ...
    frames = sorted(char_dir.glob(f"{anim_name}_*.png"))
    if frames:
        return frames

    # Try pattern: character_anim_00.png
    frames = sorted(char_dir.glob(f"{character}_{anim_name}_*.png"))
    if frames:
        return frames

    # Try single frame: anim.png
    single = char_dir / f"{anim_name}.png"
    if single.exists():
        return [single]

    return []


def pack_character_sheet(character: str, animations: list[tuple[str, int]]) -> None:
    """
    Pack animation frames for a character into a sprite sheet.
    Only uses frames 00 and 01 (which are consistently good from PixelLab).
    Creates a 2-column grid with one animation per row.
    """
    print(f"\n{character}:")

    char_dir = CHARACTERS_DIR / character
    if not char_dir.exists():
        print(f"  Directory {char_dir} not found, skipping")
        return

    # Collect frames per animation - ONLY use frames 00 and 01
    anim_data = []  # list of (anim_name, frame_rate, [frame_images])
    total_frames = 0
    COLS = 2  # Fixed: only 2 good frames per animation

    for anim_name, frame_rate in animations:
        frame_paths = find_anim_frames(character, anim_name)
        if not frame_paths:
            print(f"  No frames for {anim_name}, skipping animation")
            continue

        # Only take the first 2 frames (00 and 01) - these are consistently good
        good_paths = frame_paths[:2]
        frames = []
        for p in good_paths:
            img = Image.open(p).convert("RGBA")
            if img.size != (FRAME_SIZE, FRAME_SIZE):
                img = img.resize((FRAME_SIZE, FRAME_SIZE), Image.NEAREST)
            frames.append(img)

        # If we only got 1 frame, duplicate it
        if len(frames) == 1:
            frames.append(frames[0].copy())

        skipped = len(frame_paths) - len(good_paths)
        skip_note = f" (skipped {skipped} degraded frames)" if skipped > 0 else ""
        print(f"  {anim_name}: {len(frames)} frames{skip_note}")

        anim_data.append((anim_name, frame_rate, frames))
        total_frames += len(frames)

    if not anim_data:
        print(f"  No animation frames found for {character}, skipping sheet")
        return

    # Build sprite sheet: 2 columns, one animation per row
    rows = len(anim_data)

    sheet = Image.new("RGBA", (COLS * FRAME_SIZE, rows * FRAME_SIZE), (0, 0, 0, 0))

    frame_index = 0
    metadata_anims = []

    for row_idx, (anim_name, frame_rate, frames) in enumerate(anim_data):
        start_frame = frame_index
        for col_idx, frame_img in enumerate(frames):
            x = col_idx * FRAME_SIZE
            y = row_idx * FRAME_SIZE
            sheet.paste(frame_img, (x, y))
            frame_index += 1

        metadata_anims.append({
            "name": anim_name,
            "row": row_idx,
            "startFrame": start_frame,
            "endFrame": frame_index - 1,
            "frameCount": len(frames),
            "frameRate": frame_rate,
        })

    # Save sheet PNG
    sheet_path = OUTPUT_SPRITES / f"{character}_sheet.png"
    sheet.save(sheet_path)
    print(f"  Saved {sheet_path} ({total_frames} frames, {COLS}x{rows} grid)")

    # Save JSON metadata
    metadata = {
        "frameWidth": FRAME_SIZE,
        "frameHeight": FRAME_SIZE,
        "columns": COLS,
        "rows": rows,
        "totalFrames": total_frames,
        "animations": metadata_anims,
    }
    meta_path = OUTPUT_SPRITES / f"{character}_sheet.json"
    meta_path.write_text(json.dumps(metadata, indent=2))
    print(f"  Saved {meta_path}")


def copy_tiles():
    """Copy tile images from sprites/generated/tiles/ to assets/tiles/."""
    tiles_src = GENERATED_DIR / "tiles"
    if not tiles_src.exists():
        print("\n  No generated tiles directory found, skipping tiles")
        return

    print("\nTiles:")
    count = 0
    for img_path in sorted(tiles_src.glob("*.png")):
        dest = OUTPUT_TILES / img_path.name
        shutil.copy2(img_path, dest)
        count += 1
        print(f"  Copied {img_path.name} -> {dest}")

    if count == 0:
        print("  No tile images found")
    else:
        print(f"  Copied {count} tile(s)")


def copy_backgrounds():
    """Copy background images from sprites/generated/backgrounds/ to assets/backgrounds/."""
    bg_src = GENERATED_DIR / "backgrounds"
    if not bg_src.exists():
        print("\n  No generated backgrounds directory found, skipping backgrounds")
        return

    print("\nBackgrounds:")
    count = 0
    for img_path in sorted(bg_src.glob("*.png")):
        dest = OUTPUT_BACKGROUNDS / img_path.name
        shutil.copy2(img_path, dest)
        count += 1
        print(f"  Copied {img_path.name} -> {dest}")

    if count == 0:
        print("  No background images found")
    else:
        print(f"  Copied {count} background(s)")


def copy_ui():
    """Copy UI element images from sprites/generated/ui/ to assets/ui/."""
    ui_src = GENERATED_DIR / "ui"
    if not ui_src.exists():
        print("\n  No generated UI directory found, skipping UI")
        return

    print("\nUI Elements:")
    count = 0
    for img_path in sorted(ui_src.glob("*.png")):
        dest = OUTPUT_UI / img_path.name
        shutil.copy2(img_path, dest)
        count += 1
        print(f"  Copied {img_path.name} -> {dest}")

    if count == 0:
        print("  No UI images found")
    else:
        print(f"  Copied {count} UI element(s)")


def copy_effects():
    """Copy effect images from sprites/generated/effects/ to assets/effects/."""
    fx_src = GENERATED_DIR / "effects"
    if not fx_src.exists():
        print("\n  No generated effects directory found, skipping effects")
        return

    print("\nEffects:")
    count = 0
    for img_path in sorted(fx_src.glob("*.png")):
        dest = OUTPUT_EFFECTS / img_path.name
        shutil.copy2(img_path, dest)
        count += 1
        print(f"  Copied {img_path.name} -> {dest}")

    if count == 0:
        print("  No effect images found")
    else:
        print(f"  Copied {count} effect(s)")


def main():
    print("Dark City Sprite Sheet Packer")
    print("=" * 40)

    if not GENERATED_DIR.exists():
        print(f"\nGenerated sprites directory ({GENERATED_DIR}) not found.")
        print("Run your sprite generation pipeline first, then re-run this packer.")
        print("Skipping gracefully -- no assets produced.")
        return

    # Pack character sprite sheets
    print("\n--- Character Sprite Sheets ---")
    for character, animations in SHEET_DEFINITIONS.items():
        try:
            pack_character_sheet(character, animations)
        except Exception as e:
            print(f"  ERROR packing {character}: {e}")

    # Copy tiles, backgrounds, UI
    print("\n--- Tiles ---")
    try:
        copy_tiles()
    except Exception as e:
        print(f"  ERROR copying tiles: {e}")

    print("\n--- Backgrounds ---")
    try:
        copy_backgrounds()
    except Exception as e:
        print(f"  ERROR copying backgrounds: {e}")

    print("\n--- UI Elements ---")
    try:
        copy_ui()
    except Exception as e:
        print(f"  ERROR copying UI: {e}")

    print("\n--- Effects ---")
    try:
        copy_effects()
    except Exception as e:
        print(f"  ERROR copying effects: {e}")

    print("\n" + "=" * 40)
    print("Done!")


if __name__ == "__main__":
    main()
