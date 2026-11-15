import json
from PIL import Image, ImageDraw, ImageColor

atlas = Image.open('assets/office-atlas.png')
meta = json.load(open('assets/office-atlas.json'))
S = meta['sprites']

def put(img, name, x, y, scale=2):
    sp = S.get(name)
    if not sp: return
    tile = atlas.crop((sp['x'], sp['y'], sp['x']+sp['w'], sp['y']+sp['h']))
    tile = tile.resize((sp['w']*scale, sp['h']*scale), Image.NEAREST)
    img.alpha_composite(tile, (int(x), int(y)))

img = Image.new('RGBA', (640, 400), (30, 37, 54, 255))
d = ImageDraw.Draw(img)
# floor
for yy in range(8, 392, 32):
    for xx in range(8, 632, 32):
        col = (217, 201, 163) if ((xx//32)+(yy//32)) % 2 == 0 else (203, 185, 143)
        d.rectangle([xx, yy, xx+31, yy+31], fill=col)
# walls
d.rectangle([0, 0, 640, 24], fill=(58, 69, 96))
d.rectangle([0, 0, 12, 400], fill=(58, 69, 96))
d.rectangle([628, 0, 640, 400], fill=(58, 69, 96))
d.rectangle([0, 388, 640, 400], fill=(58, 69, 96))
d.rectangle([404, 24, 412, 174], fill=(58, 69, 96))
d.rectangle([404, 210, 412, 310], fill=(58, 69, 96))
d.rectangle([12, 292, 184, 300], fill=(58, 69, 96))
d.rectangle([224, 292, 470, 300], fill=(58, 69, 96))
d.rectangle([510, 292, 628, 300], fill=(58, 69, 96))

for x in (30, 150, 270, 470):
    put(img, 'window', x, 2)
put(img, 'door', 402, 176); put(img, 'door', 186, 290); put(img, 'door', 472, 290)
put(img, 'rug', 436, 200); put(img, 'sofa', 430, 244); put(img, 'table', 470, 140)
put(img, 'board', 500, 44); put(img, 'shelf', 430, 60); put(img, 'clock', 560, 30)
put(img, 'coffee', 592, 60); put(img, 'cooler', 580, 246)
put(img, 'plant', 404, 250)
put(img, 'bin', 600, 210)
put(img, 'server', 600, 150)
put(img, 'printer', 560, 120)
put(img, 'books', 470, 120)
put(img, 'lamp', 500, 100); put(img, 'plant2', 20, 250); put(img, 'cactus', 380, 250); put(img, 'flower', 24, 40)

DESKS = [('coder',90,180),('manager',210,180),('reviewer',330,180),('analyst',90,268),('tester',210,268),('archivist',330,268)]
for role, x, y in DESKS:
    d.ellipse([x-34, y+6, x+34, y+16], fill=(0,0,0,40))
    put(img, role+'_sit', x-10, y-44)
    put(img, 'desk', x-32, y-14)
    put(img, 'monitor', x-30, y-36)
    put(img, 'mug', x+18, y-30)
    put(img, 'papers', x-26, y-30)
    d.text((x-20, y-58), role, fill=(220,230,245,255))
# idle character in lounge
put(img, 'tester_sit', 446, 170)

img = img.resize((1280, 800), Image.NEAREST)
img.save('/tmp/scene-preview.png')
print('ok')
