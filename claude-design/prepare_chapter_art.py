from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE_DIR = ROOT / "assets" / "chapter-art" / "original"
OUTPUT_DIR = ROOT / "assets" / "chapter-art" / "pdf"
TARGET_SIZE = (1200, 686)


def normalize_connected_paper_white(image: Image.Image, threshold: int = 247) -> Image.Image:
    """Set only the near-white region connected to the canvas edge to paper white."""
    gray = image.convert("L")
    pixels = gray.load()
    width, height = gray.size
    queue: deque[tuple[int, int]] = deque()
    seen = bytearray(width * height)

    def add(x: int, y: int) -> None:
        offset = y * width + x
        if not seen[offset] and pixels[x, y] >= threshold:
            seen[offset] = 1
            queue.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = 255
        if x:
            add(x - 1, y)
        if x + 1 < width:
            add(x + 1, y)
        if y:
            add(x, y - 1)
        if y + 1 < height:
            add(x, y + 1)
    return gray


def prepare(source: Path, destination: Path) -> None:
    image = normalize_connected_paper_white(Image.open(source).convert("RGB"))
    scale = min(TARGET_SIZE[0] / image.width, TARGET_SIZE[1] / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    resized = image.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("L", TARGET_SIZE, 255)
    canvas.paste(resized, ((TARGET_SIZE[0] - size[0]) // 2, (TARGET_SIZE[1] - size[1]) // 2))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, format="PNG", optimize=True, compress_level=9, dpi=(280, 280))


def main() -> None:
    sources = sorted(SOURCE_DIR.glob("chapter-*.png"))
    expected = {f"chapter-{number:02d}.png" for number in range(1, 12)}
    found = {path.name for path in sources}
    if found != expected:
        raise SystemExit(f"Chapter art mismatch. Missing={sorted(expected - found)} extra={sorted(found - expected)}")
    for source in sources:
        destination = OUTPUT_DIR / source.name
        prepare(source, destination)
        print(destination)


if __name__ == "__main__":
    main()
