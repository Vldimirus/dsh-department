import json
from PIL import Image, ImageDraw

P = {
    '.': None, 'o': (43, 43, 58), 'd': (58, 58, 78), 'f': (217, 201, 163), 'F': (203, 185, 143),
    'w': (138, 90, 43), 'W': (168, 113, 58), 'b': (61, 70, 92), 'B': (78, 89, 116),
    's': (226, 232, 240), 'S': (143, 211, 255), 'k': (40, 48, 66), 'g': (63, 138, 79),
    'G': (79, 160, 94), 'p': (242, 205, 164), 'h': (90, 58, 34), 'H': (52, 36, 22),
    'r': (194, 90, 74), 'u': (61, 123, 255), 'U': (91, 149, 255), 'v': (122, 92, 255),
    'y': (216, 192, 122), 'c': (223, 230, 238), 'm': (154, 167, 184), 'M': (200, 212, 230),
    'n': (122, 74, 36), 't': (63, 90, 60), 'j': (240, 200, 90), 'e': (120, 200, 255),
}

FLOOR = [
    'ffffffffffffffff','fFffFfffFfffFfff','ffffffffffffffff','fFffFfffFfffFfff',
    'ffffffffffffffff','fFffFfffFfffFfff','ffffffffffffffff','fFffFfffFfffFfff',
    'ffffffffffffffff','fFffFfffFfffFfff','ffffffffffffffff','fFffFfffFfffFfff',
    'ffffffffffffffff','fFffFfffFfffFfff','ffffffffffffffff','fFffFfffFfffFfff',
]
WALL = [
    'oooooooooooooooo','oBBBBBBBBBBBBBBo','oBbBbBbBbBbBbBbo','oBBBBBBBBBBBBBBo',
    'oBbBbBbBbBbBbBbo','oBBBBBBBBBBBBBBo','oooooooooooooooo','oddddddddddddddo',
    'oddddddddddddddo','oddddddddddddddo','oooooooooooooooo','oddddddddddddddo',
    'oddddddddddddddo','oddddddddddddddo','oooooooooooooooo','oooooooooooooooo',
]
DESK = [
    'oooooooooooooooooooooooooooooooo',
    'oWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo',
    'oWwwwwwwwwwwwwwwwwwwwwwwwwwwwwWo',
    'oWwwwwwwwwwwwwwwwwwwwwwwwwwwwwWo',
    'oWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo',
    'oooooooooooooooooooooooooooooooo',
    ' oddo                      oddo ',
    ' oddo                      oddo ',
    ' oddo                      oddo ',
    ' oddo                      oddo ',
    ' oddo                      oddo ',
    ' oooo                      oooo ',
]
CHAIR = [
    ' oooooooooo ',
    ' oMMMMMMMMo ',
    ' oMmmmmmmMo ',
    ' oMmmmmmmMo ',
    ' oMMMMMMMMo ',
    ' oooooooooo ',
    ' oMmmmmmmMo ',
    ' oooooooooo ',
    '  ow    wo  ',
    '  ow    wo  ',
    '  oo    oo  ',
]
MONITOR = [
    'oooooooooooooo',
    'oBBBBBBBBBBBBo',
    'oBSSSSSSSSSSBo',
    'oBSssssssssSBo',
    'oBSssssssssSBo',
    'oBSSSSSSSSSSBo',
    'oBBBBBBBBBBBBo',
    'oooooooooooooo',
    '     okko     ',
    '     okko     ',
    '   oooooooo   ',
    '   oooooooo   ',
]
PLANT1 = [
    '      oo        ','     oGGo       ','   ooGGGGoo     ','  oGGGGGGGGo    ',
    ' oGGgGGGgGGGo   ',' oGgGGGGGgGGo   ','  ooGGGGGGGo    ','    oGGGGo      ',
    '     oGG o      ','     oGGGo      ','    ooooooo     ','   owwwwwww o   ',
    '   owwwwwww o   ','   owwwwwww o   ','    ooooooo     ',
]
PLANT2 = [
    '     oo   oo    ','    oGGo oGGo   ','   oGGGGoGGGo   ','  oGGgGGGGgGGo  ',
    '  oGgGGGGGGgGo  ','   oGGGGGGGGo   ','    ooGGGGoo    ','      oGGo      ',
    '      oGGo      ','     ooooooo    ','    oWWWWWWWo   ','    owwwwwwwo   ',
    '    owwwwwwwo   ','     ooooooo    ',
]
CACTUS = [
    '      oo        ','     oGGo       ','   ooGGoo       ','  oGGGGGGo      ',
    '  oGGGGGGo      ','   oGGGGo       ','    oGGo        ','    oGGo        ',
    '   ooooooo      ','  oWWWWWWWo     ','  owwwwwwwo     ','   ooooooo      ',
]
FLOWER = [
    '     oo  oo     ','    oGG oGG     ','   oGGGoGGGo    ','  oGGGGoGGGGGo  ',
    '  oGGGGGGGGGGo  ','   oGGGGGGGGo   ','    ooGGGGoo    ','      oGGo      ',
    '      oGGo      ','     ooooooo    ','    oWWWWWWWo   ','    owwwwwwwo   ','     ooooooo    ',
]
COOLER = [
    '   oooooo   ','  oSSSSSSo  ','  oSssssSo  ','  oSssssSo  ','  oSSSSSSo  ',
    '   oooooo   ','  oMMMMMMo  ','  oMmmmmMo  ','  oMmooooMo ','  oMmo  oMo ',
    '  oMmmmmmMo ','  oMMMMMMMo ','  oMMMMMMMo ','  ooooooooo ',
]
COFFEE = [
    '  oooooooo  ','  oMMMMMMo  ','  oMSSSSMo  ','  oMSSSSMo  ','  oMmmmmMo  ',
    '  oMooooMo  ','  oMo  oMo  ','  oMmmmmMo  ','  oMMMMMMo  ','  ommmmmmo  ','  oooooooo  ',
]
SOFA = [
    'oooooooooooooooooooooooooooooooo',
    'orrrrrrrrrrrrrrrrrrrrrrrrrrrrrro',
    'orrrrrrrrrrrrrrrrrrrrrrrrrrrrrro',
    'oyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyo',
    'oyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyo',
    'oooooooooooooooooooooooooooooooo',
    'oo                          oooo',
    'oo                          oooo',
    'oooooooooooooooooooooooooooooooo',
]
TABLE = [
    'oooooooooooooooooooooooo',
    'oWWWWWWWWWWWWWWWWWWWWWWo',
    'oWwwwwwwwwwwwwwwwwwwwwWo',
    'oooooooooooooooooooooooo',
    ' owo                owo ',
    ' owo                owo ',
    ' ooo                ooo ',
]
BOOKS = [
    'oooooooo','ommmccoo','orrggdoo','oyybbnoo','occmrrdo','oooooooo',
]
PAPERS = [
    'ooooooooo','occccccco','oc oo cco','occccccco','oc oo cco','occccccco','ooooooooo',
]
MUG = [
    'oooooo','occcco','ocncco','occcco','oooooo',
]
LAMP = [
    '  oooo  ',' ojoroo ',' ojojoro','  oooo  ','   oo   ','   oo   ','   oo   ','  oooo  ',
]
BIN = [
    ' oooooo ',' ommmmo ',' ommmmo ',' ommmmo ',' ooooo  ',
]
BOARD = [
    'oooooooooooooooooooo','oyyyyyyyyyyyyyyyyyyo','oyo oo oo oo oo oo yo',
    'oyo oo oo oo oo oo yo','oyo oo oo oo oo oo yo','oyyyyyyyyyyyyyyyyyyo','oooooooooooooooooooo',
]
WINDOW = [
    'oooooooooooooooo','oSSSSSSSSSSSSSSo','oSssssssssssssSo','oSSSSSSSSSSSSSSo',
    'oSssssssssssssSo','oSSSSSSSSSSSSSSo','oooooooooooooooo',
]
DOOR = [
    'oooooooo','oWwwwwWo','oWwwwwWo','oWwwwwWo','oWwwwwWo','oWwwwwWo','oWwwwwWo','oWwwwwWo','oooooooo',
]
RUG = [
    'yyyyyyyyyyyyyyyy','ywwwwwwwwwwwwwwy','ywyywwyywwyywwyy','ywwwwwwwwwwwwwwy','yyyyyyyyyyyyyyyy',
]
SERVER = [
    'oooooooooooooooo','okkkkkkkkkkkkkko','okkSkkkkSkkkkkko','okkkkkkkkkkkkkko',
    'okkSkkkkSkkkkkko','okkkkkkkkkkkkkko','oooooooooooooooo',
]
PRINTER = [
    'oooooooooooooooo','oMMMMMMMMMMMMMMo','oMmmmmmmmmmmmmMo','oMmoSSSSSSSomMo',
    'oMmmmmmmmmmmmmMo','oMMMMMMMMMMMMMMo','oooooooooooooooo',
]
CLOCK = [
    ' ooooo ','oMcMcMo','oMcccMo','oMcmcMo','oMcccMo',' ooooo ',
]
LAPTOP = [
    'oooooooooooo','oSSSSSSSSSSo','oSssssssssSo','oSSSSSSSSSSo','oooooooooooo','okkkkkkkkkko',
]
SHELF = [
    'oooooooo','owwwwwwo','owccbbwo','owwwwwwo','owbbccwo','owwwwwwo','owccbbwo','oooooooo',
]
KETTLE = [
    '  oooo  ',' ommmmo ','oMccMMMo','oMccMMMo','oMccMMMo',' ommmmo ','  oooo  ',
]

CHAR_BODY = [
    '    oooo    ',
    '   oHHHHo   ',
    '   oHppHo   ',
    '   oppppo   ',
    '   opoopo   ',
    '    oppo    ',
    '    omo     ',
    '   oUUUUo   ',
    '  oUUUUUUo  ',
    ' poUUUUUUop ',
    ' poUUUUUUop ',
    '  oUUUUUUo  ',
    '  oUUUUUUo  ',
    '   oU  Uo   ',
    '   oU  Uo   ',
    '   oU  Uo   ',
    '   oo  oo   ',
    '  ooo  ooo  ',
]
CHAR_SIT = [
    '    oooo    ',
    '   oHHHHo   ',
    '   oHppHo   ',
    '   oppppo   ',
    '   opoopo   ',
    '    oppo    ',
    '    omo     ',
    '   oUUUUo   ',
    '  oUUUUUUo  ',
    ' poUUUUUUop ',
    ' poUUUUUUop ',
    '  oUUUUUUo  ',
    '  oUUUUUUo  ',
    '  oooooooo  ',
]

SPRITES = {
    'floor': FLOOR, 'wall': WALL, 'desk': DESK, 'chair': CHAIR, 'monitor': MONITOR,
    'plant': PLANT1, 'plant2': PLANT2, 'cactus': CACTUS, 'flower': FLOWER,
    'cooler': COOLER, 'coffee': COFFEE, 'sofa': SOFA, 'table': TABLE,
    'books': BOOKS, 'papers': PAPERS, 'mug': MUG, 'lamp': LAMP, 'bin': BIN,
    'board': BOARD, 'window': WINDOW, 'door': DOOR, 'rug': RUG, 'server': SERVER,
    'printer': PRINTER, 'clock': CLOCK, 'laptop': LAPTOP, 'shelf': SHELF, 'kettle': KETTLE,
}

ROLE_COLORS = {
    'manager': {'U': (122, 92, 255)},
    'coder': {'U': (61, 123, 255)},
    'reviewer': {'U': (63, 168, 79)},
    'tester': {'U': (224, 140, 60)},
    'analyst': {'U': (70, 180, 190)},
    'archivist': {'U': (150, 110, 90)},
    'instrumenter': {'U': (200, 80, 100)},
}

def render(rows, overrides=None):
    w = max(len(r) for r in rows); h = len(rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if x >= len(row): continue
            if overrides and ch in overrides: color = overrides[ch]
            else: color = P.get(ch)
            if color: px[x, y] = (*color, 255)
    return im

items = []
for name, rows in SPRITES.items():
    items.append((name, render(rows)))
for role, over in ROLE_COLORS.items():
    items.append((f'{role}_stand', render(CHAR_BODY, over)))
    items.append((f'{role}_sit', render(CHAR_SIT, over)))

PAD = 2
x = y = PAD
row_h = 0
atlas_w = 256
positions = {}
atlas = Image.new('RGBA', (atlas_w, 1024), (0, 0, 0, 0))
for name, im in items:
    if x + im.width + PAD > atlas_w:
        x = PAD; y += row_h + PAD; row_h = 0
    atlas.alpha_composite(im, (x, y))
    positions[name] = {'x': x, 'y': y, 'w': im.width, 'h': im.height}
    x += im.width + PAD
    row_h = max(row_h, im.height)
used_h = y + row_h + PAD
atlas = atlas.crop((0, 0, atlas_w, used_h))
atlas.save('assets/office-atlas.png')
json.dump({'tile': 16, 'sprites': positions}, open('assets/office-atlas.json', 'w'), indent=1)

# preview
SCALE = 4
cols = 6
cell_w = 120; cell_h = 110
rows_n = (len(items) + cols - 1) // cols
img = Image.new('RGBA', (cols * cell_w, rows_n * cell_h), (32, 40, 56, 255))
drag = ImageDraw.Draw(img)
for i, (name, im) in enumerate(items):
    big = im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)
    cx = (i % cols) * cell_w + 8; cy = (i // cols) * cell_h + 8
    img.alpha_composite(big, (cx, cy))
img.save('/tmp/atlas-preview.png')
print('atlas', atlas.size, 'sprites', len(items), 'preview', img.size)
