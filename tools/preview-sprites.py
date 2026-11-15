from PIL import Image, ImageDraw

P = {
    '.': None,
    'o': (43, 43, 58),      # outline
    'd': (58, 58, 78),      # dark
    'f': (217, 201, 163),   # floor light
    'F': (203, 185, 143),   # floor dark
    'w': (138, 90, 43),     # wood
    'W': (168, 113, 58),    # wood light
    'b': (61, 70, 92),      # wall
    'B': (78, 89, 116),     # wall light
    's': (226, 232, 240),   # screen light
    'S': (143, 211, 255),   # screen
    'k': (40, 48, 66),      # keyboard / dark metal
    'g': (63, 138, 79),     # green
    'G': (79, 160, 94),     # green light
    'p': (242, 205, 164),   # skin
    'h': (90, 58, 34),      # hair brown
    'H': (52, 36, 22),      # hair black
    'r': (194, 90, 74),     # shirt red
    'u': (61, 123, 255),    # shirt blue
    'U': (91, 149, 255),    # shirt blue light
    'v': (122, 92, 255),    # shirt violet
    'y': (216, 192, 122),   # beige
    'c': (223, 230, 238),   # white
    'm': (154, 167, 184),   # grey
    'M': (200, 212, 230),   # grey light
    'n': (122, 74, 36),     # coffee brown
    't': (63, 90, 60),      # dark green
}

def sprite(rows):
    w = max(len(r) for r in rows)
    h = len(rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            color = P.get(ch)
            if color:
                px[x, y] = (*color, 255)
    return im

SPRITES = {
    'пол': [
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
        'ffffffffffffffff',
        'fFffFfffFfffFfff',
    ],
    'стена': [
        'oooooooooooooooo',
        'oBBBBBBBBBBBBBBo',
        'oBbBbBbBbBbBbBbo',
        'oBBBBBBBBBBBBBBo',
        'oBbBbBbBbBbBbBbo',
        'oBBBBBBBBBBBBBBo',
        'oooooooooooooooo',
        'oddddddddddddddo',
        'oddddddddddddddo',
        'oddddddddddddddo',
        'oooooooooooooooo',
        'oddddddddddddddo',
        'oddddddddddddddo',
        'oddddddddddddddo',
        'oooooooooooooooo',
        'oooooooooooooooo',
    ],
    'стол': [
        'oooooooooooooooooooooooooooooooo',
        'oWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo',
        'oWwwwwwwwwwwwwwwwwwwwwwwwwwwwwwo',
        'oWwwwwwwwwwwwwwwwwwwwwwwwwwwwwwo',
        'oooooooooooooooooooooooooooooooo',
        ' owo                          owo',
        ' owo                          owo',
        ' owo                          owo',
        ' owo                          owo',
        ' owo                          owo',
        ' owo                          owo',
        ' ooo                          ooo',
    ],
    'стул': [
        ' oooooooo ',
        ' oMMMMMMo ',
        ' oMmmmmMo ',
        ' oMmmmmMo ',
        ' oMmmmmMo ',
        ' oMMMMMMo ',
        ' oooooooo ',
        '  ow  wo  ',
        '  ow  wo  ',
        '  ow  wo  ',
        ' oooooooo ',
    ],
    'монитор': [
        'oooooooooooooooo',
        'oSSSSSSSSSSSSSSo',
        'oSssssssssssssSo',
        'oSssssssssssssSo',
        'oSssssssssssssSo',
        'oSSSSSSSSSSSSSSo',
        'oooooooooooooooo',
        '   okkkkkkkko   ',
        '   o        o   ',
        '   o        o   ',
        '   oooooooooo   ',
    ],
    'растение1': [
        '      oo        ',
        '     oGGo       ',
        '   ooGGGGoo     ',
        '  oGGGGGGGGo    ',
        ' oGGgGGGgGGGo   ',
        ' oGgGGGGGgGGo   ',
        '  ooGGGGGGGo    ',
        '    oGGGGo      ',
        '     oGG o      ',
        '     oGGGo      ',
        '    ooooooo     ',
        '   owwwwwww o   ',
        '   owwwwwww o   ',
        '   owwwwwww o   ',
        '    ooooooo     ',
    ],
    'растение2': [
        '     oo   oo    ',
        '    oGGo oGGo   ',
        '   oGGGGoGGGo   ',
        '  oGGgGGGGgGGo  ',
        '  oGgGGGGGGgGo  ',
        '   oGGGGGGGGo   ',
        '    ooGGGGoo    ',
        '      oGGo      ',
        '      oGGo      ',
        '     ooooooo    ',
        '    oWWWWWWWo   ',
        '    owwwwwwwo   ',
        '    owwwwwwwo   ',
        '     ooooooo    ',
    ],
    'кулер': [
        '    oooooo      ',
        '   oSSSSSSo     ',
        '   oSssssSo     ',
        '   oSssssSo     ',
        '   oSSSSSSo     ',
        '    ooooooo     ',
        '   oMMMMMMMo    ',
        '   oMmmmmmMo    ',
        '   oMmooooMMo   ',
        '   oMmo  oMMo   ',
        '   oMmmmmmMMo   ',
        '   oMMMMMMMMo   ',
        '   oMMMMMMMMo   ',
        '   oooooooooo   ',
    ],
    'кофемашина': [
        '  oooooooooo   ',
        '  oMMMMMMMMo   ',
        '  oMmmmmmmMo   ',
        '  oMooooooMo   ',
        '  oMoSSSSoMo   ',
        '  oMooooooMo   ',
        '  oMmmmmmmMo   ',
        '  oMMMMMMMMo   ',
        '  oMmoooMmMo   ',
        '  oMmo  oMMo   ',
        '  oMmo  oMMo   ',
        '  oooooooooo   ',
    ],
    'диван': [
        'oooooooooooooooooooooooooooooooo',
        'orrrrrrrrrrrrrrrrrrrrrrrrrrrrrro',
        'orrrrrrrrrrrrrrrrrrrrrrrrrrrrrro',
        'oooooooooooooooooooooooooooooooo',
        'o yyyyyy oo yyyyyyyy oo yyyyyy o',
        'o yyyyyy oo yyyyyyyy oo yyyyyy o',
        'oooooooooooooooooooooooooooooooo',
        'oowwo                  owo     o',
        'oowwo                  owo     o',
        'oooooooooooooooooooooooooooooooo',
    ],
    'человек': [
        '   oooo   ',
        '  oHHHHo  ',
        '  oHppHo  ',
        '  oppppo  ',
        '  opoopo  ',
        '  o ppo   ',
        '  o omo   ',
        '   oooo   ',
        '  oUUUUo  ',
        ' oUUUUUUo ',
        'poUUUUUUop',
        'poUUUUUUop',
        ' oUUUUUUo ',
        '  oU  Uo  ',
        '  oU  Uo  ',
        '  oU  Uo  ',
        '  oo  oo  ',
        ' ooo  ooo ',
    ],
    'человек сидит': [
        '   oooo   ',
        '  oHHHHo  ',
        '  oHppHo  ',
        '  oppppo  ',
        '  opoopo  ',
        '  o ppo   ',
        '  o omo   ',
        '   oooo   ',
        '  oUUUUo  ',
        ' oUUUUUUo ',
        'poUUUUUUop',
        'poUUUUUUop',
        ' oUUUUUUo ',
        '  oUUUUo  ',
        '  ooooo   ',
    ],
}

SCALE = 6
PAD = 18
LABEL_H = 18
cell_w = max(max(len(r) for r in rows) for rows in SPRITES.values()) * SCALE + PAD
cell_h = max(len(rows) for rows in SPRITES.values()) * SCALE + PAD + LABEL_H
cols = 4
rows_n = (len(SPRITES) + cols - 1) // cols
img = Image.new('RGBA', (cols * cell_w, rows_n * cell_h), (32, 40, 56, 255))
draw = ImageDraw.Draw(img)
for i, (name, rows) in enumerate(SPRITES.items()):
    sp = sprite(rows)
    sp = sp.resize((sp.width * SCALE, sp.height * SCALE), Image.NEAREST)
    cx = (i % cols) * cell_w + PAD // 2
    cy = (i // cols) * cell_h + PAD // 2
    img.alpha_composite(sp, (cx, cy))
    draw.text((cx, cy + sp.height + 2), name, fill=(220, 230, 245, 255))
img.save('/tmp/sprites-preview.png')
print('saved', img.size, 'sprites:', len(SPRITES))
