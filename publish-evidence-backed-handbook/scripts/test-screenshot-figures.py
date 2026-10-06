#!/usr/bin/env python3
"""Exercise frozen screenshot validation, PDF splitting and reader semantics."""
import argparse
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
from collections import Counter
from copy import deepcopy
from pathlib import Path

from PIL import Image, ImageDraw
from pypdf import PdfReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate

from screenshot_figures import ScreenshotFigure, copy_figure_assets, figure_markdown, load_figures, validate_placements, figure_html

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--browser')
parser.add_argument('--playwright-module')
args = parser.parse_args()
output = Path(args.output).resolve()
if output.exists():
    raise SystemExit('Use a fresh screenshot fixture directory')
book = output / 'future-screenshots'
(book / 'assets/screenshots').mkdir(parents=True)
(book / 'source/diagrams').mkdir(parents=True)
kit = Path(__file__).resolve().parents[1]
manifest = {'schemaVersion': 1, 'figures': [{'id': 's01-start', 'caption': 'Frozen UI colors and values remain visible.', 'panels': []}]}
for name, dimensions, color in [('wide.png', (1200, 700), '#ffbe00'), ('native.jpg', (1024, 768), '#192323'), ('mobile.png', (390, 1177), '#eeeeea')]:
    path = book / 'assets/screenshots' / name
    Image.new('RGB', dimensions, color).save(path)
    manifest['figures'][0]['panels'].append({'asset': str(path.relative_to(book)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'alt': f'{name} captured state', 'label': name, 'maxHeightPoints': 200})
manifest_path = book / 'screenshot-figures.json'
manifest_path.write_text(json.dumps(manifest))
figures = load_figures(book)
assert len(figures) == 1
validate_placements(figures, ['s01-start'])


def reject(data, message):
    manifest_path.write_text(json.dumps(data))
    try:
        load_figures(book)
    except ValueError as error:
        assert message in str(error), str(error)
    else:
        raise AssertionError('Invalid screenshot manifest accepted: ' + message)


broken = deepcopy(manifest); broken['figures'][0]['panels'][0]['asset'] = '../private.png'; reject(broken, 'Unsafe')
broken = deepcopy(manifest); broken['figures'][0]['panels'][0]['asset'] = 'assets/missing.png'; reject(broken, 'Missing screenshot asset')
broken = deepcopy(manifest); broken['figures'][0]['panels'][0]['sha256'] = '0' * 64; reject(broken, 'hash mismatch')
broken = deepcopy(manifest); broken['figures'][0]['panels'][0]['alt'] = ''; reject(broken, 'alt text')
broken = deepcopy(manifest); broken['figures'][0]['panels'][0]['minPpi'] = 119; reject(broken, '120 through 600')
broken = deepcopy(manifest); broken['figures'][0]['panels'][0]['minPpi'] = 120; reject(broken, 'capture density and legibility reason')
broken = deepcopy(manifest); broken['figures'][0]['panels'][0]['fullAsset'] = 'assets/screenshots/wide.png'; reject(broken, 'path and hash')
broken = deepcopy(manifest); broken['figures'].append(deepcopy(broken['figures'][0])); reject(broken, 'duplicate')
alpha = book / 'assets/screenshots/alpha.png'; Image.new('RGBA', (500, 500), (0, 0, 0, 0)).save(alpha)
broken = deepcopy(manifest); broken['figures'][0]['panels'][0].update(asset='assets/screenshots/alpha.png', sha256=hashlib.sha256(alpha.read_bytes()).hexdigest()); reject(broken, 'opaque RGB')
(book / 'other').mkdir(); collision = book / 'other/wide.png'; Image.new('RGB', (500, 500), 'red').save(collision)
broken = deepcopy(manifest); broken['figures'][0]['panels'][1].update(asset='other/wide.png', sha256=hashlib.sha256(collision.read_bytes()).hexdigest()); reject(broken, 'basename')
manifest_path.write_text(json.dumps(manifest))
for used in [[], ['unknown'], ['s01-start', 's01-start']]:
    try:
        validate_placements(figures, used)
    except ValueError:
        pass
    else:
        raise AssertionError('Unknown, missing or duplicate marker accepted')

# Source-pixel framing is a layout operation, not an image rewrite. The
# synthetic pattern distinguishes the requested region from the top-left.
crop_book = output / 'crop-book'; (crop_book / 'assets/screenshots').mkdir(parents=True)
crop_source = crop_book / 'assets/screenshots/region.png'
pattern = Image.new('RGB', (600, 400), '#fa0032')
draw = ImageDraw.Draw(pattern); draw.rectangle((300, 100, 499, 249), fill='#00cc62'); draw.rectangle((350, 140, 449, 209), fill='#2255dd')
pattern.save(crop_source)
source_sha = hashlib.sha256(crop_source.read_bytes()).hexdigest()
crop_manifest = {'schemaVersion': 1, 'figures': [{'id': 'region', 'caption': 'Green region with a blue center.', 'panels': [{'asset': 'assets/screenshots/region.png', 'sha256': source_sha, 'alt': 'Requested green and blue region.', 'crop': [300, 100, 200, 150], 'sourcePrivacy': 'internal'}]}]}
crop_manifest_path = crop_book / 'screenshot-figures.json'; crop_manifest_path.write_text(json.dumps(crop_manifest))
cropped = load_figures(crop_book)
assert cropped['region']['panels'][0]['_dimensions'] == (200, 150)
assert cropped['region']['panels'][0]['_sourceDimensions'] == (600, 400)
for bounds in [[-1, 0, 200, 100], [0, 0, 0, 100], [400, 0, 201, 100], [0, 350, 200, 51], [0, 0, 100.5, 100], [False, 0, 100, 100], [0, 0, 200]]:
    invalid = deepcopy(crop_manifest); invalid['figures'][0]['panels'][0]['crop'] = bounds; crop_manifest_path.write_text(json.dumps(invalid))
    try:
        load_figures(crop_book)
    except ValueError:
        pass
    else:
        raise AssertionError('Invalid crop accepted: ' + str(bounds))
crop_manifest_path.write_text(json.dumps(crop_manifest))
crop_output = crop_book / 'reader'
copy_figure_assets(cropped['region'], crop_output, 'crop-book', '1.0.0')
crop_html = figure_html(cropped['region'], 'crop-book', '1.0.0')
assert 'data-screenshot-crop="300,100,200,150"' in crop_html
assert 'href="/crop-book/editions/v1.0.0/assets/screenshots/region-panel-1.html"' in crop_html
assert 'href="/crop-book/editions/v1.0.0/assets/screenshots/region.png"' not in crop_html
assert 'data-screenshot-distribution="internal-only"' in crop_html
assert json.loads((crop_output / 'screenshot-distribution.json').read_text())['distribution'] == 'internal-only'
assert (crop_output / 'editions/v1.0.0/assets/screenshots/region.png').read_bytes() == crop_source.read_bytes()
assert 'style="max-width:200px"' in crop_html
size_manifest = {'schemaVersion': 1, 'figures': [{'id': 'native-size', 'caption': 'Native image sizing fixture.', 'panels': []}]}
for name, dimensions in [('tiny.png', (147, 50)), ('large.png', (1024, 100))]:
    size_source = crop_book / 'assets/screenshots' / name
    Image.new('RGB', dimensions, '#2255dd').save(size_source)
    size_manifest['figures'][0]['panels'].append({'asset': str(size_source.relative_to(crop_book)), 'sha256': hashlib.sha256(size_source.read_bytes()).hexdigest(), 'alt': 'Native sizing fixture ' + name})
(crop_book / 'size-figures.json').write_text(json.dumps(size_manifest))
size_figure = load_figures(crop_book, 'size-figures.json')['native-size']
copy_figure_assets(size_figure, crop_output, 'crop-book', '1.0.0')
size_html = figure_html(size_figure, 'crop-book', '1.0.0')
assert 'style="max-width:147px"' in size_html
css = (kit / 'assets/reader/flowable-reader.css').read_text()
theme_css = (kit / 'assets/reader/theme.css').read_text()
(crop_output / 'index.html').write_text('<!doctype html><html><head><style>' + css + theme_css + 'body{margin:0;background:var(--paper,#fff);color:var(--ink,#171716)}#figure-region{width:200px;margin:0}.size-fixture{width:100%;max-width:760px}.size-fixture .reader-screenshot{margin:0}</style></head><body><main id="main-content">' + crop_html + '<section class="size-fixture">' + size_html + '</section><figure id="legacy-frame"><img src="/crop-book/editions/v1.0.0/assets/screenshots/region.png" alt="Legacy figure"></figure></main></body></html>')
cropped_markdown = figure_markdown(cropped['region'], 'crop-book', '1.0.0')
assert 'Source-pixel crop (x, y, width, height): 300, 100, 200, 150.' in cropped_markdown
assert '![Requested green' not in cropped_markdown
assert 'region-panel-1.html' in cropped_markdown
assert 'Internal candidate' in cropped_markdown

pdfmetrics.registerFont(TTFont('ScreenshotFixture', str(kit / 'assets/design-system/fonts/NotoSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('ScreenshotFixtureBold', str(kit / 'assets/design-system/fonts/NotoSans-Bold.ttf')))
caption = ParagraphStyle('ScreenshotCaption', fontName='ScreenshotFixture', fontSize=8, leading=11)
label = ParagraphStyle('ScreenshotLabel', fontName='ScreenshotFixtureBold', fontSize=8, leading=11)
figure = ScreenshotFigure(figures['s01-start'], caption, label)
figure.wrap(346, 490)
assert figure.height > 490
for group in figure._groups:
    for kind, part, _ in group:
        if kind == 'image':
            with Image.open(part[0]) as image:
                assert image.width / (part[1] / 72) >= 240 - .001
assert len(figure.split(346, 490)) == 2
pdf = output / 'figures.pdf'
SimpleDocTemplate(str(pdf), pagesize=(420, 594.96), leftMargin=37, rightMargin=37, topMargin=43, bottomMargin=51).build([figure])
reader = PdfReader(pdf, strict=True)
assert len(reader.pages) == 2
text = '\n'.join(page.extract_text() for page in reader.pages)
assert text.count('Frozen UI colors and values remain visible.') == 1
assert 'Figure 1 (continued)' in text
for page in reader.pages:
    for image in page.images:
        assert '/SMask' not in image.indirect_reference.get_object()
        assert '/Mask' not in image.indirect_reference.get_object()
audit_spec = importlib.util.spec_from_file_location('appearance_audit', kit / 'scripts/audit-pdf-appearance.py')
appearance = importlib.util.module_from_spec(audit_spec); audit_spec.loader.exec_module(appearance)
paired = appearance.audit(pdf, pdf, 0, manifest_path)
assert paired['status'] == 'passed', paired['failures']
assert len(paired['candidate']['screenshotPlacements']) == 3
assert appearance.audit(pdf, pdf, 1, manifest_path)['status'] == 'failed'
assert appearance.audit(pdf, pdf, 0)['status'] == 'failed'
broken = deepcopy(manifest); broken['figures'][0]['panels'].append(deepcopy(broken['figures'][0]['panels'][0])); manifest_path.write_text(json.dumps(broken))
assert appearance.audit(pdf, pdf, 0, manifest_path)['status'] == 'failed'
manifest_path.write_text(json.dumps(manifest))

crop_pdf = output / 'crop.pdf'
SimpleDocTemplate(str(crop_pdf), pagesize=(420, 594.96), leftMargin=37, rightMargin=37, topMargin=43, bottomMargin=51).build([ScreenshotFigure(cropped['region'], caption, label)])
crop_reader = PdfReader(crop_pdf, strict=True)
embedded = crop_reader.pages[0].images[0].image.convert('RGB')
assert embedded.tobytes() == pattern.tobytes(), 'PDF embedded source pixels changed'
assert appearance.audit(crop_pdf, crop_pdf, 0, crop_manifest_path)['status'] == 'passed'
subprocess.run(['pdftoppm', '-singlefile', '-png', '-r', '240', str(crop_pdf), str(output / 'crop-painted')], check=True)
with Image.open(output / 'crop-painted.png') as painted:
    colors = Counter(painted.convert('RGB').get_flattened_data())
    assert colors[(0, 204, 98)] > 10000 and colors[(34, 85, 221)] > 5000
    assert colors[(250, 0, 50)] == 0, 'Top-left source region leaked into the PDF frame'
assert hashlib.sha256(crop_source.read_bytes()).hexdigest() == source_sha

# An explicit native-UI exception changes placement size, never the pixels.
exception_manifest = deepcopy(crop_manifest)
exception_manifest['figures'][0]['panels'][0].update(minPpi=120, printReadability={'captureDensity': 'Synthetic 1x bitmap with 14px label fixture.', 'labelPixelHeight': 14, 'reason': 'At 120PPI a 14px label is 8.4pt. Screenshot exception only.'})
exception_manifest_path = crop_book / 'exception-figures.json'; exception_manifest_path.write_text(json.dumps(exception_manifest))
exception_figures = load_figures(crop_book, 'exception-figures.json')
exception_pdf = output / 'exception.pdf'
from reportlab.pdfgen.canvas import Canvas
SimpleDocTemplate(str(exception_pdf), pagesize=(420, 594.96), leftMargin=37, rightMargin=37, topMargin=43, bottomMargin=51).build([ScreenshotFigure(exception_figures['region'], caption, label)], canvasmaker=lambda *args, **kwargs: Canvas(*args, **dict(kwargs, initialFontName='ScreenshotFixture')))
assert appearance.audit(exception_pdf, exception_pdf, 0, exception_manifest_path)['status'] == 'passed'
assert appearance.audit(exception_pdf, exception_pdf, 0, crop_manifest_path)['status'] == 'failed'
parity_spec = importlib.util.spec_from_file_location('pair_validator', kit / 'scripts/validate_pdf_pair.py')
parity = importlib.util.module_from_spec(parity_spec); parity_spec.loader.exec_module(parity)
assert not parity.describe(exception_pdf, exception_manifest_path)['errors']
assert parity.describe(exception_pdf)['errors'], 'Unbound native bitmap incorrectly accepted below 240PPI'
nested_manifest = crop_book / 'source/figures/exception.json'; nested_manifest.parent.mkdir(parents=True); nested_manifest.write_bytes(exception_manifest_path.read_bytes())
assert not parity.describe(exception_pdf, nested_manifest, crop_book)['errors']
assert appearance.audit(exception_pdf, exception_pdf, 0, nested_manifest, crop_book)['status'] == 'passed'
fixture_spec = json.loads((kit / 'handbook-spec.json').read_text()); fixture_spec['pdf']['requireOutline'] = False
fixture_spec_path = output / 'unit-spec.json'; fixture_spec_path.write_text(json.dumps(fixture_spec))
subprocess.run([sys.executable, str(kit / 'scripts/validate-pdf.py'), '--pdf', str(exception_pdf), '--profile', 'specimen', '--spec', str(fixture_spec_path), '--screenshot-manifest', str(exception_manifest_path), '--output', str(output / 'exception-structural.json')], check=True)
if bool(args.browser) != bool(args.playwright_module):
    raise ValueError('Browser crop regression needs both --browser and --playwright-module')
if args.browser:
    subprocess.run(['node', str(kit / 'scripts/screenshot-browser-check.mjs'), '--root', str(crop_output), '--browser', args.browser, '--playwright-module', args.playwright_module, '--output', str(output / 'browser-crop')], check=True)
    for name in ['reader.png', 'larger.png', 'print.png', 'explicit-dark.png', 'system-dark.png']:
        with Image.open(output / 'browser-crop' / name) as capture:
            assert capture.size == (200, 150)
            assert capture.convert('RGB').tobytes() == pattern.crop((300, 100, 500, 250)).tobytes(), name + ' did not show the exact source region'

# Exercise the real Markdown parser and hosted converter with one chapter and
# screenshot directive. Geometry here is synthetic regression input only.
art = book / 'assets/chapter-art/pdf/chapter-01.png'; art.parent.mkdir(parents=True); Image.new('RGB', (1400, 800), 'white').save(art)
nodes = [{'id': str(i), 'label': 'Fixture stage'} for i in range(5)]
(book / 'source/diagrams/CoverDiagram.json').write_text(json.dumps({'title': 'Fixture cover', 'kind': 'sequence', 'nodes': nodes, 'edges': [{'from': str(i), 'to': str(i + 1)} for i in range(4)]}))
source = '---\ntitle: Future screenshots\nversion: 1.0.0\n---\n# Orientation\n\nText before the figure.\n<!-- FIGURE s01-start -->\n\n```html\n<!-- FIGURE example-not-a-placement -->\n```\n\n<!-- CHAPTER 01 | One chapter | Frozen inputs. -->\n# One chapter\n\nInstruction.\n'
(book / 'manuscript.md').write_text(source)
(book / 'source/build_handbook.py').write_text('from markdown_layout import *\n')
config = {'id': 'future-screenshots', 'title': 'Future screenshots', 'version': '1.0.0', 'date': '2026-10-05', 'markdown': 'manuscript.md', 'coverKicker': 'FIXTURE', 'coverTitleHtml': 'Future screenshots', 'subtitle': 'Frozen input regression', 'editionLabel': 'Candidate', 'contentsDeck': 'Fixture contents'}
(book / 'pdf-config.json').write_text(json.dumps(config))
env = {**os.environ, 'PYTHONPATH': str(kit / 'scripts'), 'HANDBOOK_BOOK_ROOT': str(book), 'HANDBOOK_PDF_CONFIG': json.dumps(config)}
parser_command = [sys.executable, '-c', 'from markdown_layout import parse_markdown;from screenshot_figures import ScreenshotFigure;assert sum(isinstance(x,ScreenshotFigure) for x in parse_markdown())==1']
subprocess.run(parser_command, env=env, check=True)
for malformed in [source.replace('s01-start -->', 'unknown -->', 1), source.replace('<!-- FIGURE s01-start -->', '<!-- FIGURE s01-start -->\n<!-- FIGURE s01-start -->'), source.replace('<!-- FIGURE s01-start -->', ''), source.replace('<!-- FIGURE s01-start -->', '<!-- FIGURE ../bad -->')]:
    (book / 'manuscript.md').write_text(malformed)
    result = subprocess.run(parser_command, env=env, capture_output=True, text=True)
    assert result.returncode != 0
(book / 'manuscript.md').write_text(source)
(book / 'output/pdf').mkdir(parents=True); (book / 'output/pdf/figures.pdf').write_bytes(pdf.read_bytes())
(book / 'release-manifest.json').write_text(json.dumps({'title': config['title'], 'version': config['version'], 'date': config['date'], 'pdf': 'output/pdf/figures.pdf', 'pages': 2}))
(book / 'publication.json').write_text(json.dumps({'author': 'Fixture', 'authorSite': 'https://example.org', 'review': None, 'editionUrl': '/future-screenshots/editions/v1.0.0/', 'releaseUrl': '/future-screenshots/editions/v1.0.0/'}))
reader_config = {'skipContentsText': True, 'skipStyles': ['TOC_TITLE'], 'chapterNumbers': True, 'semanticLists': True, 'tableHeaders': True, 'illustrationClass': 'ChapterIllustration', 'artAlt': 'Fixture {number}', 'diagramClasses': ['CoverDiagram'], 'storyFunction': 'parse_markdown', 'downloadTitle': config['title'], 'subtitle': config['subtitle'], 'canonicalUrl': '/future-screenshots/', 'extraCss': ''}
subprocess.run([sys.executable, '-c', 'from flowable_reader import build_reader;import json,sys;build_reader(sys.argv[1],json.loads(sys.argv[2]),sys.argv[3])', str(book), json.dumps(reader_config), str(book / 'reader')], env=env, check=True)
html = (book / 'reader/index.html').read_text()
# Exercise the shared semantic-diagram installer against actual generated
# reader markup, so independently owned image contracts coexist.
subprocess.run(['node', '--input-type=module', '-e', 'import {readFile} from "node:fs/promises"; import {installDiagrams} from ' + json.dumps((kit / 'scripts/diagrams.mjs').as_uri()) + '; const html=await readFile(process.argv[1]+"/reader/index.html","utf8"); if(await installDiagrams(process.argv[1],html,{readerDirectory:"reader",files:{}})!==html)throw Error("Screenshot markup changed by diagram installer");', str(book)], check=True)
assert html.count('class="reader-screenshot"') == 1
assert html.count('class="reader-screenshot-larger"') == 3
assert html.count('class="chapter-art"') == 1
for panel in manifest['figures'][0]['panels']:
    image = book / panel['asset']
    assert (book / 'reader/editions/v1.0.0/assets/screenshots' / image.name).read_bytes() == image.read_bytes()
    assert panel['alt'] in html

spec = importlib.util.spec_from_file_location('machine_markdown', kit / 'scripts/export-machine-markdown.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
markdown, index = module.export(source, {}, 'unverified', figures=figures, book_id='future-screenshots', version='1.0.0')
assert len(index['figures']) == 1
assert '![wide.png captured state](https://handbooks.surfaces.systems/future-screenshots/editions/v1.0.0/assets/screenshots/wide.png)' in markdown
assert '**Figure 1.** Frozen UI colors' in markdown
assert '<!-- FIGURE s01-start -->' not in markdown
assert '<!-- FIGURE example-not-a-placement -->' in markdown
result = {'status': 'passed', 'checks': ['safe paths and hashes', 'opaque frozen bytes', 'complete alt/caption', 'missing/unknown/duplicate marker rejection', 'default minimum 240 PPI', 'documented screenshot-only 120PPI exception', 'unbound artwork remains 240PPI', 'pair and structural exception binding', 'split between panels', 'caption once', 'no PDF image masks', 'exact screenshot pixel/count audit', 'chapter count remains independent', 'semantic reader figures', 'shared diagram installer compatibility', 'immutable copied assets', 'chapter-art preserved', 'portable authored Markdown', 'crop bounds', 'original bytes unchanged', 'painted PDF crop region', 'internal source distribution flags', 'cropped larger-view HTML', *(['exact browser crop pixels in reader/larger/print'] if args.browser else [])]}
(output / 'screenshot-tests.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
