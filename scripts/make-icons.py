"""Render public/icon.svg into the PNG sizes iOS and Android need. Run: python3 scripts/make-icons.py"""
from pathlib import Path
from playwright.sync_api import sync_playwright

pub = Path(__file__).resolve().parent.parent / 'public'
svg = (pub / 'icon.svg').read_text()

def page(size, scale=1.0):
    # scale < 1 shrinks the artwork inside the background (maskable safe zone)
    return f"""<html><body style="margin:0;background:#111418">
    <div style="width:{size}px;height:{size}px;display:grid;place-items:center;background:#111418">
      <div style="width:{size*scale}px;height:{size*scale}px">{svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </div></body></html>"""

targets = [('apple-touch-icon.png', 180, 1.0), ('icon-192.png', 192, 1.0), ('icon-512.png', 512, 1.0), ('icon-maskable-512.png', 512, 0.78)]
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, size, scale in targets:
        pg = b.new_page(viewport={'width': size, 'height': size})
        pg.set_content(page(size, scale))
        pg.screenshot(path=str(pub / name))
        pg.close()
    b.close()
print('wrote', [t[0] for t in targets])
