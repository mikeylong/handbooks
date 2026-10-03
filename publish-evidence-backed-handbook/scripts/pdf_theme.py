"""PDF colors are assigned before layout. Light browser print remains independent."""
import json, os
from pathlib import Path
from reportlab.lib.colors import HexColor
TOKEN_PATH = Path(__file__).resolve().parents[1] / 'assets/design-system/pdf-appearance.json'

def theme_tokens(theme):
    if theme not in ('light', 'dark'): raise ValueError('Unknown PDF appearance')
    return json.loads(TOKEN_PATH.read_text())[theme]

def theme_color(value):
    if os.environ.get('HANDBOOK_PDF_THEME', 'light') == 'light': return HexColor(value)
    t = theme_tokens('dark')
    # Legacy governed palette roles map to shared semantic colors at construction.
    v = str(value).lower()
    if v in ('#333333', '#3d3b38', '#4d4b47', '#44423e'): return HexColor(t['muted'])
    if v == '#bbbbbb': return HexColor(t['rule'])
    if v.startswith('#f'): return HexColor(t['raised'])
    return HexColor(t['ink'])

def paint_page(canvas, width, height):
    t = theme_tokens(os.environ.get('HANDBOOK_PDF_THEME', 'light'))
    if os.environ.get('HANDBOOK_PDF_THEME', 'light') != 'dark': return
    canvas.saveState(); canvas.setFillColor(HexColor(t['paper']))
    canvas.rect(0, 0, width, height, fill=1, stroke=0); canvas.restoreState()

def isolated_output(book, output):
    book, output = Path(book).resolve(), Path(output).absolute()
    if output.is_symlink() or output.resolve() != output: raise ValueError('Unsafe output path')
    # Existing artifacts are immutable; callers always choose a new candidate path.
    if output.exists(): raise ValueError('Refusing to overwrite an existing artifact')
    if output.suffix != '.pdf': raise ValueError('Output must be a PDF')
    for protected in ('output/pdf','reader','handbook','assets','editions'):
        if output.is_relative_to(book / protected): raise ValueError('Output is in a protected release directory')
    if '/Documents/' in str(output) or '/Desktop/' in str(output): raise ValueError('Use local storage')
    output.parent.mkdir(parents=True, exist_ok=True)
    return output
