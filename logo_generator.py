from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

out_dir = r'c:\Users\rprak\Downloads\custom_image_puzzle_game_v2\assets'
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'logo.png')

W, H = 1800, 700
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

candidates = [
    r'C:\Windows\Fonts\segprint.ttf',
    r'C:\Windows\Fonts\gabriola.ttf',
    r'C:\Windows\Fonts\Inkfree.ttf',
    r'C:\Windows\Fonts\arial.ttf',
    r'C:\Windows\Fonts\cour.ttf',
    r'C:\Windows\Fonts\calibri.ttf',
]
font = None
for candidate in candidates:
    if os.path.exists(candidate):
        try:
            font = ImageFont.truetype(candidate, 290)
            break
        except Exception:
            pass
if font is None:
    font = ImageFont.load_default()

text = 'Puzzle'
# create a more hand-drawn effect with multiple layered strokes
for i in range(5):
    x = 110 + i * 14
    y = 150 + i * 10
    for dx in range(-9, 10, 3):
        for dy in range(-9, 10, 3):
            draw.text((x + dx, y + dy), text, font=font, fill=(245, 180, 0, 255), stroke_width=6, stroke_fill=(255, 206, 58, 255))
    draw.text((x, y), text, font=font, fill=(255, 185, 0, 255), stroke_width=3, stroke_fill=(221, 160, 0, 220))

img = img.filter(ImageFilter.GaussianBlur(0.25))
img.save(out_path)
print(out_path)
