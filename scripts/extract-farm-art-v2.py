#!/usr/bin/env python3
"""Extract the second-generation farm atlases into game-ready PNG assets."""

from pathlib import Path
import shutil
import sys

from PIL import Image


STRUCTURES = {
    "farmhouse": (0, 0, (96, 96)),
    "depot": (1, 0, (96, 96)),
    "reservoir": (2, 0, (64, 64)),
    "well": (3, 0, (64, 64)),
    "mill-foundation": (0, 1, (96, 80)),
    "mill-1": (1, 1, (96, 96)),
    "mill-2": (2, 1, (112, 96)),
    "mill-4": (3, 1, (128, 104)),
    "crate-empty": (0, 2, (48, 48)),
    "crate-full": (1, 2, (48, 48)),
    "sprinkler-off": (2, 2, (48, 48)),
    "sprinkler-on": (3, 2, (48, 48)),
}

GAMEPLAY = {
    "wheat-0": (0, 0, (40, 40)),
    "wheat-1": (1, 0, (40, 40)),
    "wheat-2": (2, 0, (40, 40)),
    "wheat-3": (3, 0, (40, 40)),
    # The generated direction order is up, down, right, left.
    "farmer-up": (0, 1, (32, 40)),
    "farmer-down": (1, 1, (32, 40)),
    "farmer-right": (2, 1, (32, 40)),
    "farmer-left": (3, 1, (32, 40)),
    "brush": (0, 2, (48, 48)),
    "rock": (1, 2, (48, 48)),
    "marsh": (2, 2, (64, 48)),
    "cart": (3, 2, (80, 48)),
}


def remove_magenta(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            key_distance = ((255 - r) ** 2 + g ** 2 + (255 - b) ** 2) ** 0.5
            if key_distance < 72:
                pixels[x, y] = (r, g, b, 0)
    return image


def fit(image: Image.Image, target: tuple[int, int]) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)
    width, height = target
    scale = min((width - 2) / image.width, (height - 2) / image.height)
    image = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.NEAREST,
    )
    output = Image.new("RGBA", target, (0, 0, 0, 0))
    output.alpha_composite(image, ((width - image.width) // 2, height - image.height))
    return output


def extract_grid(source: Image.Image, assets: dict, output_dir: Path) -> None:
    cell_width = source.width // 4
    cell_height = source.height // 3
    for name, (column, row, target) in assets.items():
        cell = source.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        if source.mode != "RGBA":
            cell = remove_magenta(cell)
        output = fit(cell.convert("RGBA"), target)
        if name == "marsh":
            # Remove a detached chroma-edge sliver at the far right of this cell.
            output.paste((0, 0, 0, 0), (target[0] - 8, 0, target[0], target[1]))
        output.save(output_dir / f"{name}.png", optimize=True)


def terrain_tiles(source: Image.Image, output_dir: Path) -> None:
    # The terrain generator used two tall rows; square samples avoid stretching.
    cells = {
        "grass-a": (0, 0),
        "grass-b": (313, 0),
        "grass-c": (313, 313),
        "soil-dry": (627, 0),
        "soil-wet": (0, 627),
        "path": (313, 627),
        "channel-v": (627, 627),
        "channel-h": (941, 627),
    }
    for name, (left, top) in cells.items():
        tile = source.crop((left, top, left + 313, top + 313))
        tile.resize((32, 32), Image.Resampling.NEAREST).save(output_dir / f"{name}.png", optimize=True)


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit("usage: extract-farm-art-v2.py STRUCTURES TERRAIN GAMEPLAY OUTPUT_DIR")
    structure_path, terrain_path, gameplay_path, output_path = map(Path, sys.argv[1:])
    output_dir = output_path
    output_dir.mkdir(parents=True, exist_ok=True)

    for source, filename in (
        (structure_path, "source-structures.png"),
        (terrain_path, "source-terrain.png"),
        (gameplay_path, "source-gameplay.png"),
    ):
        destination = output_dir / filename
        if source.resolve() != destination.resolve():
            shutil.copy2(source, destination)

    extract_grid(Image.open(structure_path), STRUCTURES, output_dir)
    extract_grid(Image.open(gameplay_path), GAMEPLAY, output_dir)
    terrain_tiles(Image.open(terrain_path), output_dir)
    print(f"wrote {len(STRUCTURES) + len(GAMEPLAY) + 8} assets to {output_dir}")


if __name__ == "__main__":
    main()
