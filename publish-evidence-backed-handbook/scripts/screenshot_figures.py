"""Frozen screenshot inputs shared by PDF, hosted reader and Markdown editions."""
from __future__ import annotations

import hashlib
import html
import json
import math
import re
import shutil
from collections import Counter
from pathlib import Path
from urllib.parse import quote

from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Flowable, Paragraph

ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9-]*")
HASH = re.compile(r"[a-f0-9]{64}")


def safe_file(root, value):
    root = Path(root).resolve()
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("Unsafe screenshot asset path")
    relative = Path(value)
    if relative.is_absolute() or any(p in ("..", ".") for p in value.split("/")):
        raise ValueError("Unsafe screenshot asset path")
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Screenshot asset escapes the book")
    return path


def _asset(root, value, sha256):
    path = safe_file(root, value)
    if not HASH.fullmatch(str(sha256)):
        raise ValueError(f"Missing screenshot SHA-256: {value}")
    if not path.is_file():
        raise ValueError(f"Missing screenshot asset: {value}")
    if hashlib.sha256(path.read_bytes()).hexdigest() != sha256:
        raise ValueError(f"Screenshot hash mismatch: {value}")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpg|jpeg)", path.name):
        raise ValueError(f"Unsafe screenshot filename or unsupported format: {value}")
    with Image.open(path) as image:
        if image.format not in {"PNG", "JPEG"} or image.mode != "RGB":
            raise ValueError(f"Screenshot must be a frozen opaque RGB PNG or JPEG: {value}")
        expected = "PNG" if path.suffix == ".png" else "JPEG"
        if image.format != expected:
            raise ValueError(f"Screenshot extension does not match its bytes: {value}")
        image.verify()
    with Image.open(path) as image:
        dimensions = image.size
    return path, dimensions


def load_figures(book_root, manifest="screenshot-figures.json", required=False):
    """Load a book-owned manifest; prepared assets are never modified here."""
    root = Path(book_root).resolve()
    path = safe_file(root, manifest)
    if not path.exists():
        if required:
            raise ValueError(f"Missing screenshot manifest: {manifest}")
        return {}
    data = json.loads(path.read_text())
    if not isinstance(data, dict) or data.get("schemaVersion") != 1 or not isinstance(data.get("figures"), list):
        raise ValueError("Invalid screenshot manifest schema")
    figures, basenames = {}, {}
    for ordinal, entry in enumerate(data["figures"], 1):
        if not isinstance(entry, dict):
            raise ValueError("Screenshot figure definition must be an object")
        identity = entry.get("id", "")
        if not isinstance(identity, str) or not ID.fullmatch(identity) or identity in figures:
            raise ValueError(f"Invalid or duplicate screenshot figure ID: {identity}")
        caption = entry.get("caption", "")
        panels = entry.get("panels")
        if not isinstance(caption, str) or not caption.strip() or not isinstance(panels, list) or not panels:
            raise ValueError(f"Screenshot figure requires a caption and panels: {identity}")
        figure = {"id": identity, "caption": caption, "title": entry.get("title", f"Figure {ordinal}"), "panels": []}
        if not isinstance(figure["title"], str) or not figure["title"].strip():
            raise ValueError(f"Invalid screenshot title: {identity}")
        for panel in panels:
            if not isinstance(panel, dict):
                raise ValueError(f"Screenshot panel must be an object: {identity}")
            if not isinstance(panel.get("alt"), str) or not panel["alt"].strip():
                raise ValueError(f"Screenshot panel requires alt text: {identity}")
            height = panel.get("maxHeightPoints", 240)
            if isinstance(height, bool) or not isinstance(height, (int, float)) or not 72 <= height <= 420:
                raise ValueError(f"Invalid screenshot maximum height: {identity}")
            if "label" in panel and not isinstance(panel["label"], str):
                raise ValueError(f"Invalid screenshot panel label: {identity}")
            item = dict(panel)
            item["maxHeightPoints"] = height
            ppi = panel.get("minPpi", 240)
            if isinstance(ppi, bool) or not isinstance(ppi, (int, float)) or not 120 <= ppi <= 600:
                raise ValueError(f"Screenshot minimum PPI must be 120 through 600: {identity}")
            item["minPpi"] = ppi
            if ppi < 240:
                readability = panel.get("printReadability")
                if not isinstance(readability, dict) or any(not isinstance(readability.get(key), str) or not readability[key].strip() for key in ("captureDensity", "reason")):
                    raise ValueError(f"Screenshot PPI exception requires capture density and legibility reason: {identity}")
                if "labelPixelHeight" in readability and (isinstance(readability["labelPixelHeight"], bool) or not isinstance(readability["labelPixelHeight"], (int, float)) or not math.isfinite(readability["labelPixelHeight"]) or readability["labelPixelHeight"] <= 0):
                    raise ValueError(f"Invalid screenshot label pixel height: {identity}")
            item["_path"], item["_sourceDimensions"] = _asset(root, item.get("asset"), item.get("sha256"))
            item["_dimensions"] = item["_sourceDimensions"]
            if "crop" in item:
                crop = item["crop"]
                if not isinstance(crop, list) or len(crop) != 4 or any(type(value) is not int for value in crop):
                    raise ValueError(f"Screenshot crop requires four integer pixels: {identity}")
                x, y, width, height = crop
                sw, sh = item["_sourceDimensions"]
                if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > sw or y + height > sh:
                    raise ValueError(f"Screenshot crop exceeds source bounds: {identity}")
                if "fullAsset" in item:
                    raise ValueError(f"Cropped screenshot cannot use a different full asset: {identity}")
                item["_dimensions"] = (width, height)
            privacy = item.get("sourcePrivacy", "unreviewed" if "crop" in item else "public")
            if privacy not in {"public", "internal", "unreviewed"}:
                raise ValueError(f"Invalid screenshot source privacy: {identity}")
            item["_distribution"] = "public-eligible" if privacy == "public" else "internal-only"
            if ("fullAsset" in item) != ("fullSha256" in item):
                raise ValueError(f"Screenshot full image requires a path and hash: {identity}")
            if "fullAsset" in item:
                item["_fullPath"], _ = _asset(root, item["fullAsset"], item["fullSha256"])
            else:
                item["_fullPath"] = item["_path"]
            for asset, digest in [(item["_path"], item["sha256"]), (item["_fullPath"], item.get("fullSha256", item["sha256"]))]:
                if asset.name in basenames and basenames[asset.name] != digest:
                    raise ValueError(f"Conflicting screenshot asset basename: {asset.name}")
                basenames[asset.name] = digest
            figure["panels"].append(item)
        figure["_distribution"] = "internal-only" if any(panel["_distribution"] == "internal-only" for panel in figure["panels"]) else "public-eligible"
        figures[identity] = figure
    return figures


def validate_placements(figures, used):
    counts = Counter(used)
    unknown = set(counts) - set(figures)
    if unknown:
        raise ValueError("Unknown screenshot figure ID: " + ", ".join(sorted(unknown)))
    invalid = [identity for identity in figures if counts[identity] != 1]
    if invalid:
        raise ValueError("Each screenshot figure requires exactly one source marker: " + ", ".join(invalid))


def asset_url(asset, book_id, version):
    if not re.fullmatch(r"[a-z0-9-]+", str(book_id)) or not re.fullmatch(r"\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?", str(version)):
        raise ValueError("Screenshot URLs require a valid book and content edition")
    return f"/{book_id}/editions/v{version}/assets/screenshots/{quote(Path(asset).name)}"


def _crop_view_name(figure, number):
    return f'{figure["id"]}-panel-{number + 1}.html'


def _crop_markup(panel, image):
    """CSS viewport framing; the original image bytes remain unchanged."""
    x, y, width, height = panel["crop"]
    sw, sh = panel["_sourceDimensions"]
    style = f'width:{sw / width * 100:.10g}%;left:{-x / width * 100:.10g}%;top:{-y / height * 100:.10g}%;'
    return f'<span class="reader-screenshot-crop" style="aspect-ratio:{width}/{height}" data-screenshot-crop="{x},{y},{width},{height}"><img src="{html.escape(image, quote=True)}" width="{sw}" height="{sh}" alt="{html.escape(panel["alt"], quote=True)}" loading="lazy" style="{style}"></span>'


def _crop_view_html(figure, panel, number, book_id, version):
    title = figure["title"] + (": " + panel["label"] if panel.get("label") else "")
    # Relative image paths let the private candidate work before its edition
    # route exists. This HTML never links directly to the uncropped bitmap.
    image = quote(panel["_path"].name)
    width, _ = panel["_dimensions"]
    policy = '<p class="policy">Internal candidate. Framing does not remove private pixels from the source asset.</p>' if panel["_distribution"] == "internal-only" else ''
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + html.escape(title) + '</title><style>body{margin:24px;font-family:Arial,sans-serif;color:#222;background:#fff}main{max-width:' + str(width) + 'px;margin:auto}h1{font-size:2rem;line-height:1.25;margin:0 0 16px}.reader-screenshot-crop{display:block;position:relative;overflow:hidden;width:100%}.reader-screenshot-crop img{position:absolute;max-width:none;height:auto;display:block;margin:0}.caption,.policy{line-height:1.5}.policy{font-size:.85rem}</style></head><body data-screenshot-distribution="' + panel["_distribution"] + '"><main><h1>' + html.escape(title) + '</h1>' + _crop_markup(panel, image) + '<p class="caption">' + html.escape(figure["caption"]) + '</p>' + policy + '</main></body></html>'


def copy_figure_assets(figure, output, book_id, version):
    """Install exact frozen bytes at both reader and immutable edition paths."""
    output = Path(output)
    for number, panel in enumerate(figure["panels"]):
        for source in {panel["_path"], panel["_fullPath"]}:
            edition_relative = asset_url(source, book_id, version).split(f"/{book_id}/", 1)[1]
            for relative in [f"assets/screenshots/{source.name}", edition_relative]:
                destination = output / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.exists() and destination.read_bytes() != source.read_bytes():
                    raise ValueError(f"Conflicting screenshot output asset: {relative}")
                shutil.copy2(source, destination)
        if "crop" in panel:
            view = _crop_view_html(figure, panel, number, book_id, version)
            relative = asset_url(_crop_view_name(figure, number), book_id, version).split(f"/{book_id}/", 1)[1]
            for destination in [output / "assets/screenshots" / _crop_view_name(figure, number), output / relative]:
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text(view)
    if any("crop" in panel or panel["_distribution"] == "internal-only" for panel in figure["panels"]):
        policy_file = output / "screenshot-distribution.json"
        policy = json.loads(policy_file.read_text()) if policy_file.exists() else {"schemaVersion": 1, "figures": {}}
        policy["figures"][figure["id"]] = {"distribution": figure["_distribution"], "panels": [{"asset": panel["asset"], "crop": panel.get("crop"), "sourcePrivacy": panel.get("sourcePrivacy", "unreviewed" if "crop" in panel else "public")} for panel in figure["panels"]]}
        policy["distribution"] = "internal-only" if any(value["distribution"] == "internal-only" for value in policy["figures"].values()) else "public-eligible"
        policy["limitation"] = "Layout cropping does not remove pixels. Raw source captures remain extractable from PDF and web packages."
        policy_file.write_text(json.dumps(policy, indent=2) + "\n")


def figure_html(figure, book_id, version):
    esc = lambda text: html.escape(str(text), quote=True)
    panels = []
    for number, panel in enumerate(figure["panels"]):
        image = asset_url(panel["_path"], book_id, version)
        full = asset_url(_crop_view_name(figure, number) if "crop" in panel else panel["_fullPath"], book_id, version)
        label = panel.get("label", "")
        width, height = panel["_dimensions"]
        markup = _crop_markup(panel, image) if "crop" in panel else f'<img src="{image}" width="{width}" height="{height}" alt="{esc(panel["alt"])}" loading="lazy">'
        panel_policy = f' data-screenshot-distribution="{panel["_distribution"]}"' if panel["_distribution"] == "internal-only" else ''
        panels.append('<div class="reader-screenshot-panel"' + panel_policy + '>' +
                      (f'<p class="reader-screenshot-label">{esc(label)}</p>' if label else '') +
                      f'<a class="reader-screenshot-image" href="{full}" style="max-width:{width}px">{markup}</a>' +
                      f'<a class="reader-screenshot-larger" href="{full}">View larger image{": " + esc(label) if label else ""}</a></div>')
    policy = f' data-screenshot-distribution="{figure["_distribution"]}"' if figure["_distribution"] == "internal-only" else ''
    return f'<figure class="reader-screenshot" id="figure-{esc(figure["id"])}" data-screenshot-figure="{esc(figure["id"])}"{policy}><div class="reader-screenshot-panels">' + ''.join(panels) + f'</div><figcaption><strong>{esc(figure["title"])}.</strong> {esc(figure["caption"])}</figcaption></figure>'


def figure_markdown(figure, book_id, version):
    esc = lambda text: str(text).replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]").replace("*", "\\*").replace("_", "\\_")
    lines = [f'**{esc(figure["title"])}.** {esc(figure["caption"])}', '']
    for number, panel in enumerate(figure["panels"]):
        if panel.get("label"):
            lines += [f'**{esc(panel["label"])}**', '']
        if "crop" in panel:
            crop = ", ".join(str(value) for value in panel["crop"])
            lines += [f'Image description: {esc(panel["alt"])}', '', f'Source-pixel crop (x, y, width, height): {crop}.', '',
                      f'[View larger cropped image](https://handbooks.surfaces.systems{asset_url(_crop_view_name(figure, number), book_id, version)})', '']
        else:
            lines += [f'![{esc(panel["alt"])}](https://handbooks.surfaces.systems{asset_url(panel["_path"], book_id, version)})', '',
                      f'[View larger image](https://handbooks.surfaces.systems{asset_url(panel["_fullPath"], book_id, version)})', '']
        if panel["_distribution"] == "internal-only":
            lines += ['Internal candidate. Layout cropping does not remove private pixels from the source asset.', '']
    return "\n".join(lines)


def screenshot_resolution_report(reader, paints, manifest, default_minimum=240, book_root=None):
    """Bind painted PDF pixels to approved screenshot-only PPI exceptions."""
    manifest = Path(manifest).resolve()
    root = Path(book_root).resolve() if book_root else manifest.parent
    figures = load_figures(root, str(manifest.relative_to(root)), required=True)
    expected = {}
    for figure in figures.values():
        for number, panel in enumerate(figure["panels"]):
            with Image.open(panel["_path"]) as image:
                fingerprint = hashlib.sha256(f'{image.width}x{image.height}:'.encode() + image.tobytes()).hexdigest()
            expected.setdefault(fingerprint, []).append({"figure": figure["id"], "panel": number + 1, "minimumPpi": panel["minPpi"], "printReadability": panel.get("printReadability")})
    object_pixels = {}
    for page in reader.pages:
        for image in page.images:
            reference = image.indirect_reference
            if reference is None:
                continue
            pixels = image.image.convert("RGB")
            object_pixels[f'{reference.idnum} {reference.generation}'] = hashlib.sha256(f'{pixels.width}x{pixels.height}:'.encode() + pixels.tobytes()).hexdigest()
    records = [dict(paint) for paint in paints]
    failures = []
    for fingerprint, requirements in expected.items():
        matches = sorted([paint for paint in records if object_pixels.get(paint.get("object")) == fingerprint], key=lambda paint: min(paint["xPpi"], paint["yPpi"]))
        if len(matches) != len(requirements):
            failures.append(f'Screenshot frozen pixels/count differ: expected {len(requirements)}, found {len(matches)} for {requirements[0]["figure"]}')
        for paint, requirement in zip(matches, sorted(requirements, key=lambda value: value["minimumPpi"])):
            paint["screenshot"] = requirement
            paint["requiredMinPpi"] = requirement["minimumPpi"]
    for paint in records:
        minimum = paint.get("requiredMinPpi", default_minimum)
        if min(paint["xPpi"], paint["yPpi"]) < minimum:
            kind = "screenshot" if "screenshot" in paint else "unbound artwork"
            failures.append(f'Page {paint["page"]}: {kind} below {minimum} effective PPI')
    return {"paints": records, "boundScreenshotPaints": sum("screenshot" in paint for paint in records), "minimumArtworkPpi": default_minimum}, failures


class ScreenshotFigure(Flowable):
    """Stack frozen panels; split only between complete image/caption groups."""
    def __init__(self, figure, caption_style, label_style, start=0, end=None):
        super().__init__()
        self.figure = figure
        self.caption_style = caption_style
        self.label_style = label_style
        self.start = start
        self.end = len(figure["panels"]) if end is None else end
        self.spaceBefore = 9
        self.spaceAfter = 12
        self._groups = []

    def wrap(self, available_width, available_height):
        self.width = available_width
        self._groups = []
        for number in range(self.start, self.end):
            panel = self.figure["panels"][number]
            group = []
            if number == self.start:
                title = self.figure["title"] + (" (continued)" if self.start else "")
                heading = Paragraph(html.escape(title), self.label_style)
                _, h = heading.wrap(available_width, available_height)
                group.append(("paragraph", heading, h + 5))
            if panel.get("label"):
                label = Paragraph(html.escape(panel["label"]), self.label_style)
                _, h = label.wrap(available_width, available_height)
                group.append(("paragraph", label, h + 4))
            iw, ih = panel["_dimensions"]
            # Do not invent pixels. A documented screenshot-only exception can
            # enlarge native UI labels while preserving the original bitmap.
            scale = min(available_width / iw, panel["maxHeightPoints"] / ih, 72 / panel["minPpi"])
            image = (panel["_path"], iw * scale, ih * scale, panel)
            group.append(("image", image, image[2] + 8))
            if number == len(self.figure["panels"]) - 1:
                caption = Paragraph(html.escape(self.figure["caption"]), self.caption_style)
                _, h = caption.wrap(available_width, available_height)
                group.append(("paragraph", caption, h))
            self._groups.append(group)
        self.height = sum(part[2] for group in self._groups for part in group)
        return self.width, self.height

    def split(self, available_width, available_height):
        self.wrap(available_width, available_height)
        height, count = 0, 0
        for group in self._groups:
            group_height = sum(part[2] for part in group)
            if height + group_height > available_height:
                break
            height += group_height
            count += 1
        if not count or count == self.end - self.start:
            return []
        boundary = self.start + count
        return [ScreenshotFigure(self.figure, self.caption_style, self.label_style, self.start, boundary),
                ScreenshotFigure(self.figure, self.caption_style, self.label_style, boundary, self.end)]

    def draw(self):
        y = self.height
        for group in self._groups:
            for kind, part, height in group:
                y -= height
                if kind == "image":
                    path, width, image_height, panel = part
                    left, bottom = (self.width - width) / 2, y + 8
                    if "crop" in panel:
                        x, cy, crop_width, crop_height = panel["crop"]
                        source_width, source_height = panel["_sourceDimensions"]
                        scale = width / crop_width
                        self.canv.saveState()
                        clip = self.canv.beginPath(); clip.rect(left, bottom, width, image_height)
                        self.canv.clipPath(clip, stroke=0, fill=0)
                        self.canv.drawImage(ImageReader(str(path)), left - x * scale, bottom - (source_height - cy - crop_height) * scale,
                                            width=source_width * scale, height=source_height * scale, mask=None)
                        self.canv.restoreState()
                    else:
                        self.canv.drawImage(ImageReader(str(path)), left, bottom, width=width, height=image_height, mask=None)
                else:
                    part.drawOn(self.canv, 0, y + max(0, height - part.height))
