# Passe les dessins de jetons sur la grille 80×80 (fichiers en ×10 : 800×800 px) SANS agrandir le jeton :
# on ajoute du vide transparent tout autour, le dessin reste au centre, pixel pour pixel (GIF animés compris).
# Usage : python3 scripts/pad-jetons.py   (ne touche que les images plus petites que 800×800)
import glob
from PIL import Image, ImageSequence

SIZE = 800

def pad_png(f):
    im = Image.open(f).convert('RGBA')
    if im.size == (SIZE, SIZE):
        return False
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
    out.save(f, optimize=True)
    return True

def pad_gif(f):
    im = Image.open(f)
    if im.size == (SIZE, SIZE):
        return False
    frames, durs = [], []
    for fr in ImageSequence.Iterator(im):
        durs.append(fr.info.get('duration', 100))
        frames.append(fr.convert('RGBA'))
    # palette exacte (pixel art : peu de couleurs) : index 0 = transparent
    cols = sorted({c[:3] for fr in frames for c in fr.getdata() if c[3]})
    assert len(cols) < 256, f
    idx = {c: i + 1 for i, c in enumerate(cols)}
    pal = [0, 0, 0] + [v for c in cols for v in c]
    pal += [0] * (768 - len(pal))
    out = []
    for fr in frames:
        p = Image.new('P', (SIZE, SIZE), 0)
        p.putpalette(pal)
        ox, oy = (SIZE - fr.width) // 2, (SIZE - fr.height) // 2
        data = [0 if c[3] == 0 else idx[c[:3]] for c in fr.getdata()]
        small = Image.new('P', fr.size, 0)
        small.putpalette(pal)
        small.putdata(data)
        p.paste(small, (ox, oy))
        out.append(p)
    out[0].save(f, save_all=True, append_images=out[1:], duration=durs, loop=im.info.get('loop', 0),
                transparency=0, disposal=2, optimize=False)
    return True

for f in sorted(glob.glob('public/img/jetons/serie-*/*.*')):
    done = pad_gif(f) if f.endswith('.gif') else pad_png(f)
    print(('agrandi  ' if done else 'déjà 80  ') + f)
