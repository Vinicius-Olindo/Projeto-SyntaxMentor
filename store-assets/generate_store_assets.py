from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets" / "chrome-web-store"
ICON = ROOT / "icons" / "icon128.png"

PURPLE = "#6f42c1"
PURPLE_DARK = "#4f2aa0"
PURPLE_LIGHT = "#8b5cf6"
INK = "#172033"
MUTED = "#647084"
GREEN = "#10b981"
GREEN_DARK = "#059669"
RED = "#ef4444"
AMBER = "#f59e0b"
BG = "#f6f7fb"
LINE = "#e7e9f0"


def font(name="regular", size=32):
    fonts = {
        "regular": "C:/Windows/Fonts/segoeui.ttf",
        "semibold": "C:/Windows/Fonts/seguisb.ttf",
        "bold": "C:/Windows/Fonts/segoeuib.ttf",
    }
    try:
        return ImageFont.truetype(fonts.get(name, fonts["regular"]), size)
    except OSError:
        return ImageFont.load_default()


def hex_to_rgb(color):
    color = color.lstrip("#")
    return tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient(size, start, end, vertical=False):
    w, h = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    c1 = hex_to_rgb(start)
    c2 = hex_to_rgb(end)
    steps = h if vertical else w
    for i in range(steps):
        t = i / max(steps - 1, 1)
        color = tuple(lerp(c1[j], c2[j], t) for j in range(3))
        if vertical:
            draw.line((0, i, w, i), fill=color)
        else:
            draw.line((i, 0, i, h), fill=color)
    return img.convert("RGBA")


def shadowed_round(base, xy, radius, fill, shadow=(17, 24, 39, 36), blur=18, offset=(0, 10), outline=None, width=1):
    x1, y1, x2, y2 = xy
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(layer)
    sx, sy = offset
    sd.rounded_rectangle((x1 + sx, y1 + sy, x2 + sx, y2 + sy), radius, fill=shadow)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(xy, radius, fill=fill, outline=outline, width=width)


def paste_icon(base, x, y, size):
    icon = Image.open(ICON).convert("RGBA").resize((size, size), Image.LANCZOS)
    base.alpha_composite(icon, (x, y))


def text(draw, xy, value, fill=INK, size=32, weight="regular", anchor=None, align="left"):
    draw.text(xy, value, fill=fill, font=font(weight, size), anchor=anchor, align=align)


def wrap(draw, value, max_width, size, weight="regular"):
    words = value.split()
    lines = []
    current = ""
    f = font(weight, size)
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=f)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def multiline(draw, xy, value, max_width, size=28, fill=MUTED, weight="regular", line_gap=10):
    x, y = xy
    f = font(weight, size)
    for line in wrap(draw, value, max_width, size, weight):
        draw.text((x, y), line, fill=fill, font=f)
        y += size + line_gap
    return y


def browser_shell(base, xy, title="docs.exemplo.com/editor"):
    x1, y1, x2, y2 = xy
    shadowed_round(base, xy, 8, "#ffffff", blur=24, offset=(0, 12), outline="#dfe3ee")
    draw = ImageDraw.Draw(base)
    draw.rectangle((x1, y1 + 50, x2, y1 + 51), fill="#edf0f6")
    for i, color in enumerate(["#cbd5e1", "#cbd5e1", "#cbd5e1"]):
        draw.ellipse((x1 + 22 + i * 22, y1 + 20, x1 + 32 + i * 22, y1 + 30), fill=color)
    draw.rounded_rectangle((x1 + 110, y1 + 13, x1 + 380, y1 + 37), 12, fill="#f8fafc", outline="#edf0f6")
    text(draw, (x1 + 126, y1 + 18), title, fill=MUTED, size=12, weight="semibold")


def editor_lines(base, x, y, widths, active=1):
    draw = ImageDraw.Draw(base)
    samples = [
        "Ola, estou escrevendo uma mensagem importante.",
        "A sugestao aparece antes do erro virar retrabalho.",
        "Depois eu aplico tudo em poucos cliques.",
    ]
    for i, width in enumerate(widths):
        top = y + i * 72
        outline = "#f3c4c4" if i == active else "#edf0f6"
        draw.rounded_rectangle((x, top, x + width, top + 52), 8, fill="#f8fafc", outline=outline)
        if i == active:
            draw.rounded_rectangle((x, top, x + 5, top + 52), 4, fill=RED)
        text(draw, (x + 20, top + 15), samples[i], fill="#475569", size=18, weight="regular")


def suggestion_panel(base, xy, count="3", dark=False):
    x1, y1, x2, y2 = xy
    body = "#111827" if dark else "#ffffff"
    border = "#263247" if dark else "#dfe3ee"
    shadowed_round(base, xy, 8, body, blur=24, offset=(0, 16), outline=border)
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x1, y1, x2, y1 + 62), 8, fill=PURPLE)
    draw.rectangle((x1, y1 + 52, x2, y1 + 62), fill=PURPLE)
    paste_icon(base, x1 + 18, y1 + 14, 34)
    text(draw, (x1 + 62, y1 + 20), "Sugestoes", fill="#ffffff", size=18, weight="bold")
    draw.rounded_rectangle((x2 - 54, y1 + 18, x2 - 22, y1 + 42), 12, fill="#ffffff")
    text(draw, (x2 - 38, y1 + 22), count, fill=PURPLE, size=13, weight="bold", anchor="ma")

    tab_bg = "#101827" if dark else "#f8fafc"
    draw.rectangle((x1, y1 + 62, x2, y1 + 110), fill=tab_bg)
    text(draw, (x1 + 88, y1 + 78), "Gramatica", fill="#c4b5fd" if dark else PURPLE, size=14, weight="bold")
    text(draw, (x1 + 232, y1 + 78), "Historico", fill="#aeb5c4" if dark else MUTED, size=14, weight="bold")
    draw.rectangle((x1, y1 + 108, x1 + 180, y1 + 110), fill="#c4b5fd" if dark else PURPLE)

    card_y = y1 + 134
    for i, (wrong, right, msg) in enumerate([
        ("Ola", "Olá", "Possivel erro de ortografia em portugues"),
        ("extenção", "extensão", "Correcao de ortografia de alta confianca"),
    ]):
        cy = card_y + i * 126
        fill = "#161f31" if dark else "#ffffff"
        outline = AMBER if i == 0 else ("#263247" if dark else LINE)
        draw.rounded_rectangle((x1 + 18, cy, x2 - 18, cy + 104), 8, fill=fill, outline=outline, width=2 if i == 0 else 1)
        if i == 0:
            draw.rounded_rectangle((x1 + 18, cy, x1 + 22, cy + 104), 4, fill=AMBER)
        draw.rounded_rectangle((x1 + 38, cy + 20, x1 + 100, cy + 50), 6, fill="#fff1f2", outline="#fee2e2")
        text(draw, (x1 + 52, cy + 27), wrong, fill="#dc2626", size=13, weight="bold")
        text(draw, (x1 + 118, cy + 27), "->", fill="#94a3b8", size=13, weight="bold")
        draw.rounded_rectangle((x1 + 150, cy + 20, x1 + 224, cy + 50), 6, fill="#ecfdf5", outline="#d1fae5")
        text(draw, (x1 + 164, cy + 27), right, fill=GREEN_DARK, size=13, weight="bold")
        draw.rounded_rectangle((x1 + 38, cy + 62, x1 + 110, cy + 88), 6, fill=GREEN)
        text(draw, (x1 + 55, cy + 68), "Corrigir", fill="#ffffff", size=12, weight="bold")
        text(draw, (x1 + 38, cy + 92), msg, fill="#aeb5c4" if dark else MUTED, size=10)

    if y2 - y1 > 480:
        footer = "#101827" if dark else "#f8fafc"
        draw.rectangle((x1, y2 - 142, x2, y2), fill=footer)
        draw.line((x1, y2 - 142, x2, y2 - 142), fill="#263247" if dark else LINE)
        draw.rounded_rectangle((x1 + 126, y2 - 122, x1 + 166, y2 - 92), 7, fill="#161f31" if dark else "#ffffff", outline="#263247" if dark else LINE)
        text(draw, (x1 + 140, y2 - 116), "<", fill="#aeb5c4" if dark else MUTED, size=14, weight="bold")
        draw.rounded_rectangle((x1 + 180, y2 - 122, x1 + 270, y2 - 92), 14, fill="#161f31" if dark else "#ffffff", outline="#263247" if dark else LINE)
        text(draw, (x1 + 210, y2 - 115), "1 / 8", fill="#e5e7eb" if dark else "#475569", size=12, weight="bold")
        draw.rounded_rectangle((x1 + 284, y2 - 122, x1 + 324, y2 - 92), 7, fill="#161f31" if dark else "#ffffff", outline="#263247" if dark else LINE)
        text(draw, (x1 + 298, y2 - 116), ">", fill="#aeb5c4" if dark else MUTED, size=14, weight="bold")
        draw.rounded_rectangle((x1 + 28, y2 - 78, x2 - 28, y2 - 42), 8, fill=GREEN)
        text(draw, (x1 + 160, y2 - 68), "Corrigir Tudo (8)", fill="#ffffff", size=13, weight="bold")


def popup_preview(base, xy):
    x1, y1, x2, y2 = xy
    shadowed_round(base, xy, 8, "#ffffff", blur=22, offset=(0, 12), outline="#dfe3ee")
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x1, y1, x2, y1 + 78), 8, fill=PURPLE)
    draw.rectangle((x1, y1 + 68, x2, y1 + 78), fill=PURPLE)
    paste_icon(base, x1 + 22, y1 + 20, 38)
    text(draw, (x1 + 76, y1 + 24), "SyntaxMentor", fill="#ffffff", size=20, weight="bold")
    text(draw, (x1 + 76, y1 + 50), "Revisao de escrita", fill="#ddd6fe", size=11, weight="bold")
    draw.rounded_rectangle((x1 + 22, y1 + 104, x2 - 22, y1 + 154), 8, fill="#f8fafc", outline=LINE)
    draw.ellipse((x1 + 42, y1 + 124, x1 + 54, y1 + 136), fill=GREEN)
    text(draw, (x1 + 66, y1 + 119), "Site ativo", fill=INK, size=15, weight="bold")
    text(draw, (x2 - 126, y1 + 120), "linkedin.com", fill=MUTED, size=12, weight="bold")
    draw.rounded_rectangle((x1 + 22, y1 + 174, x2 - 22, y1 + 224), 8, fill="#ffffff", outline=LINE)
    text(draw, (x1 + 42, y1 + 190), "Ignorar palavra...", fill=MUTED, size=14)
    draw.rounded_rectangle((x2 - 72, y1 + 184, x2 - 38, y1 + 218), 7, fill=GREEN)
    text(draw, (x2 - 55, y1 + 188), "+", fill="#ffffff", size=22, weight="bold", anchor="ma")


def save_icon():
    OUT.mkdir(parents=True, exist_ok=True)
    base = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    icon = Image.open(ICON).convert("RGBA").resize((96, 96), Image.LANCZOS)
    base.alpha_composite(icon, (16, 16))
    base.save(OUT / "icon-128-store.png")


def promo_small():
    img = gradient((440, 280), PURPLE_DARK, PURPLE_LIGHT)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((250, 42, 408, 220), 8, fill="#ffffff", outline="#dfe3ee")
    draw.rounded_rectangle((250, 42, 408, 86), 8, fill="#111827")
    paste_icon(img, 268, 54, 28)
    text(draw, (306, 58), "3", fill="#ffffff", size=16, weight="bold")
    for i, (a, b) in enumerate([("Ola", "Olá"), ("facil", "fácil")]):
        y = 104 + i * 48
        draw.rounded_rectangle((270, y, 388, y + 34), 7, fill="#f8fafc", outline=LINE)
        text(draw, (282, y + 9), a, fill="#dc2626", size=11, weight="bold")
        text(draw, (344, y + 9), b, fill=GREEN_DARK, size=11, weight="bold")
    draw.rounded_rectangle((38, 48, 122, 132), 18, fill="#ffffff")
    paste_icon(img, 50, 60, 60)
    text(draw, (38, 154), "SyntaxMentor", fill="#ffffff", size=26, weight="bold")
    multiline(draw, (40, 192), "Revisao clara para textos na web", 172, size=13, fill="#ede9fe", weight="semibold", line_gap=5)
    img.save(OUT / "promo-small-440x280.png")


def marquee():
    img = gradient((1400, 560), "#f8fafc", "#ede9fe", vertical=True)
    draw = ImageDraw.Draw(img)
    shadowed_round(img, (720, 74, 1290, 486), 8, "#ffffff", blur=28, offset=(0, 18), outline="#dfe3ee")
    browser_shell(img, (720, 74, 1290, 486), "app.exemplo.com/editor")
    editor_lines(img, 770, 164, [410, 460, 350], active=1)
    suggestion_panel(img, (1080, 158, 1340, 520), count="3")
    draw.rounded_rectangle((100, 110, 216, 226), 24, fill="#ffffff")
    paste_icon(img, 118, 128, 80)
    text(draw, (100, 270), "SyntaxMentor", fill=INK, size=70, weight="bold")
    multiline(draw, (104, 360), "Revisao ortografica e gramatical no fluxo de escrita.", 500, size=30, fill="#475569", weight="semibold", line_gap=12)
    draw.rounded_rectangle((106, 466, 278, 508), 8, fill=GREEN)
    text(draw, (136, 476), "Corrigir tudo", fill="#ffffff", size=18, weight="bold")
    img.save(OUT / "marquee-1400x560.png")


def screenshot_01():
    img = gradient((1280, 800), "#f8fafc", "#eef1f7", vertical=True)
    draw = ImageDraw.Draw(img)
    text(draw, (70, 70), "Corrija antes de enviar", fill=INK, size=48, weight="bold")
    multiline(draw, (72, 138), "SyntaxMentor acompanha campos de texto e mostra sugestoes sem interromper sua digitacao.", 540, size=22, fill="#475569", weight="regular")
    browser_shell(img, (70, 230, 1120, 720), "linkedin.com/feed")
    editor_lines(img, 130, 330, [640, 760, 520], active=1)
    suggestion_panel(img, (790, 326, 1110, 690), count="3")
    draw.ellipse((1130, 548, 1184, 602), fill=RED)
    text(draw, (1147, 562), "3", fill="#ffffff", size=20, weight="bold")
    img.save(OUT / "screenshot-01-revisao-em-tempo-real-1280x800.png")


def screenshot_02():
    img = gradient((1280, 800), "#111827", "#263247", vertical=True)
    draw = ImageDraw.Draw(img)
    text(draw, (70, 70), "Sugestoes claras em um painel leve", fill="#ffffff", size=44, weight="bold")
    multiline(draw, (72, 132), "Compare o trecho original, aplique a melhor sugestao ou ignore termos que fazem sentido para voce.", 560, size=22, fill="#cbd5e1")
    suggestion_panel(img, (710, 92, 1160, 720), count="8", dark=True)
    shadowed_round(img, (90, 280, 650, 650), 8, "#1f2937", blur=24, offset=(0, 16), outline="#374151")
    for i, line in enumerate([
        "Ola, tudo bem? Estou escrevendo um texto para testar.",
        "A extensao sinaliza as palavras que podem melhorar.",
        "Depois eu aplico as correcoes sem perder o contexto.",
    ]):
        y = 330 + i * 86
        draw.rounded_rectangle((130, y, 600 - i * 42, y + 54), 8, fill="#111827", outline="#374151")
        text(draw, (154, y + 16), line, fill="#e5e7eb", size=17)
    img.save(OUT / "screenshot-02-painel-de-sugestoes-1280x800.png")


def screenshot_03():
    img = gradient((1280, 800), "#f6f7fb", "#ffffff", vertical=True)
    draw = ImageDraw.Draw(img)
    text(draw, (70, 72), "Controle por site e dicionario pessoal", fill=INK, size=44, weight="bold")
    multiline(draw, (72, 132), "Ative, pause e personalize a revisao para nomes, termos tecnicos e expressoes proprias.", 610, size=22, fill="#475569")
    popup_preview(img, (90, 260, 430, 560))
    shadowed_round(img, (510, 230, 1160, 650), 8, "#ffffff", blur=24, offset=(0, 16), outline="#dfe3ee")
    draw.rounded_rectangle((510, 230, 1160, 296), 8, fill=PURPLE)
    draw.rectangle((510, 286, 1160, 296), fill=PURPLE)
    paste_icon(img, 540, 248, 34)
    text(draw, (590, 251), "Configuracoes", fill="#ffffff", size=22, weight="bold")
    for i, (title, desc, color) in enumerate([
        ("Dicionario pessoal", "Adicione palavras que nao devem aparecer como erro.", GREEN),
        ("Controle por site", "Pausar revisao em paginas especificas.", PURPLE),
        ("Atalhos", "Abra o painel e corrija tudo com rapidez.", AMBER),
    ]):
        y = 330 + i * 86
        draw.rounded_rectangle((560, y, 1110, y + 62), 8, fill="#f8fafc", outline=LINE)
        draw.rounded_rectangle((582, y + 18, 608, y + 44), 7, fill=color)
        text(draw, (628, y + 12), title, fill=INK, size=18, weight="bold")
        text(draw, (628, y + 38), desc, fill=MUTED, size=14)
    img.save(OUT / "screenshot-03-controle-e-dicionario-1280x800.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    save_icon()
    promo_small()
    marquee()
    screenshot_01()
    screenshot_02()
    screenshot_03()
    print(f"Generated Chrome Web Store assets in {OUT}")


if __name__ == "__main__":
    main()
