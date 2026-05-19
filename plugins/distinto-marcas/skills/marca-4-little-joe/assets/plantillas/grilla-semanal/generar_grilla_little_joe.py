#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / "plantilla-grilla-semanal-little-joe.png"
DATA = HERE / "grilla-semanal-ejemplo.json"

W, H = 1200, 1500
BLUE = "#61B3D1"
DEEP_BLUE = "#02467C"
INK = "#202A35"
WHITE = "#FFFFFF"
SOFT = "#F4FBFE"
PINK = "#F54275"
YELLOW = "#F7D86B"
MINT = "#A7E7D7"
CREAM = "#FFF0C9"
SHADOW = (13, 44, 64, 54)

ACCENTS = {
    "blue": {"bg": "#EAF7FC", "date": DEEP_BLUE, "text": INK},
    "pink": {"bg": PINK, "date": WHITE, "text": WHITE},
    "yellow": {"bg": YELLOW, "date": "#5B4638", "text": "#4B3E37"},
    "mint": {"bg": MINT, "date": DEEP_BLUE, "text": INK},
    "cream": {"bg": CREAM, "date": "#5B4638", "text": "#4B3E37"},
}

FONT_DIR = ROOT / "01 - IDENTIDAD DE MARCA/KIT DE MARCA 2025/LOGO"
LOGO = ROOT / "01 - IDENTIDAD DE MARCA/KIT DE MARCA 2025/LOGO/LOGO BLANCO PNG.png"


def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)


F_TITLE = font("BigShouldersDisplay-Black.ttf", 104)
F_TITLE_SMALL = font("BigShouldersDisplay-SemiBold.ttf", 42)
F_RANGE = font("BigShouldersDisplay-Bold.ttf", 36)
F_BRAND = font("BigShouldersDisplay-Black.ttf", 42)
F_DATE = font("BigShouldersDisplay-Black.ttf", 68)
F_MONTH = font("BigShouldersDisplay-Black.ttf", 40)
F_NAME = font("BigShouldersDisplay-Bold.ttf", 50)
F_META = font("BigShouldersDisplay-SemiBold.ttf", 33)
F_LABEL = font("BigShouldersDisplay-Bold.ttf", 26)
F_FOOTER = font("BigShouldersDisplay-SemiBold.ttf", 25)


def draw_center(draw, xy, text, fnt, fill):
    x, y = xy
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((x - (box[2] - box[0]) / 2, y), text, font=fnt, fill=fill)


def cover_resize(img, size):
    target_w, target_h = size
    scale = max(target_w / img.width, target_h / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    return img.crop(((nw - target_w) // 2, (nh - target_h) // 2, (nw + target_w) // 2, (nh + target_h) // 2))


def contain_resize(img, max_size):
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    return img


def rounded_shadow(base, box, radius=28, offset=(0, 10), blur=18):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shifted = (box[0] + offset[0], box[1] + offset[1], box[2] + offset[0], box[3] + offset[1])
    d.rounded_rectangle(shifted, radius=radius, fill=SHADOW)
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def safe_open_asset(path_text):
    path = Path(path_text)
    if not path.is_absolute():
        path = (ROOT / path_text).resolve()
    if not path.exists():
        return None
    return Image.open(path).convert("RGBA")


def paste_logo(canvas):
    logo = Image.open(LOGO).convert("RGBA")
    # The logo is white; keep it on the blue pill for contrast.
    logo = contain_resize(logo, (166, 78))
    canvas.alpha_composite(logo, (92, 72))


def make_background():
    canvas = Image.new("RGBA", (W, H), BLUE)
    # Soft product-color dots inspired by the Joe family palette.
    for x, y, r, c in [
        (1040, 170, 170, (245, 66, 117, 40)),
        (180, 1320, 210, (247, 216, 107, 46)),
        (1070, 1180, 160, (167, 231, 215, 50)),
    ]:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.ellipse((x - r, y - r, x + r, y + r), fill=c)
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(28)))
    return canvas


def draw_header(canvas, payload):
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((72, 50, 1128, 168), radius=34, fill=DEEP_BLUE)
    paste_logo(canvas)
    draw.text((292, 84), payload["brand"], font=F_BRAND, fill=WHITE)
    range_text = payload["date_range"]
    tw = draw.textbbox((0, 0), range_text, font=F_RANGE)[2]
    draw.rounded_rectangle((1090 - tw - 44, 84, 1094, 128), radius=22, fill=WHITE)
    draw.text((1090 - tw - 24, 89), range_text, font=F_RANGE, fill=DEEP_BLUE)

    draw_center(draw, (W / 2, 224), payload["title"], F_TITLE, WHITE)
    draw_center(draw, (W / 2, 332), payload["subtitle"], F_TITLE_SMALL, "#E8F7FC")


def draw_item(canvas, item, idx, total):
    draw = ImageDraw.Draw(canvas)
    top = 420 + idx * 182
    box = (132, top, 1068, top + 148)
    style = ACCENTS.get(item.get("accent", "blue"), ACCENTS["blue"])
    rounded_shadow(canvas, box, radius=32)
    draw.rounded_rectangle(box, radius=32, fill=style["bg"])

    date_parts = item["date_label"].split()
    date_num = date_parts[0]
    month = date_parts[1] if len(date_parts) > 1 else ""
    draw.text((178, top + 25), date_num, font=F_DATE, fill=style["date"])
    draw.text((183, top + 88), month, font=F_MONTH, fill=style["date"])
    divider = "#FFFFFF" if item.get("accent") == "pink" else DEEP_BLUE
    draw.rounded_rectangle((330, top + 24, 334, top + 124), radius=2, fill=divider)

    text_fill = style["text"]
    draw.text((362, top + 26), item["name"], font=F_NAME, fill=text_fill)
    meta = f"{item['time']} · {item['platforms']} · {item['type']}"
    draw.text((364, top + 82), meta, font=F_META, fill=text_fill)
    draw.text((365, top + 116), item["day"].upper(), font=F_LABEL, fill=text_fill)

    product = safe_open_asset(item.get("image", ""))
    if product:
        if product.mode != "RGBA":
            product = product.convert("RGBA")
        # White or transparent product renders fit naturally in the planner chip.
        if product.getbbox():
            product = product.crop(product.getbbox())
        product = contain_resize(product, (150, 122))
        px = 990 - product.width // 2
        py = top + 74 - product.height // 2
        canvas.alpha_composite(product, (px, py))
    else:
        draw.ellipse((900, top + 30, 1005, top + 135), fill=WHITE)
        draw.text((932, top + 62), "JOE", font=F_LABEL, fill=DEEP_BLUE)


def draw_footer(canvas, payload):
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((336, 1382, 864, 1428), radius=23, fill=(255, 255, 255, 225))
    draw_center(draw, (W / 2, 1390), payload["footer"], F_FOOTER, DEEP_BLUE)


def build():
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    payload["items"] = sorted(payload["items"], key=lambda i: datetime.fromisoformat(i["date"]))
    canvas = make_background()
    draw_header(canvas, payload)
    for idx, item in enumerate(payload["items"]):
        draw_item(canvas, item, idx, len(payload["items"]))
    draw_footer(canvas, payload)
    canvas.convert("RGB").save(OUT, quality=95)
    print(OUT)


if __name__ == "__main__":
    build()
