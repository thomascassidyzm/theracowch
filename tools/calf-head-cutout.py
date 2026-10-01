#!/usr/bin/env python3
"""Make the head-only, transparent calf (Moomoo) frames used by public/assets/js/calf.js.

Input:  public/assets/calf/<expr>-cut.webp  (existing background-removed 512px frames)
Output: public/assets/calf/<expr>-head.webp (head only: neck/body feathered away below the
        jaw, semi-transparent edge pixels recoloured from nearby solid fur so no beige halo,
        stray wisps dropped, re-centred on a square transparent canvas).
Run from the repo root: python3 tools/calf-head-cutout.py
"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

D = 'public/assets/calf/'
CX, CY, RX, RY, CUT = 256, 232, 136, 172, 300  # face ellipse + line above which all is kept


def blur(x, r):
    k = 2 * r + 1
    c = np.pad(np.pad(x, r, mode='edge').cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def head(src):
    c = Image.open(src).convert('RGBA')
    m = Image.new('L', c.size, 0)
    d = ImageDraw.Draw(m)
    d.rectangle([0, 0, c.size[0] - 1, CUT], fill=255)            # ears, horns, crown
    d.ellipse([CX - RX, CY - RY, CX + RX, CY + RY], fill=255)    # face + jaw; the neck falls outside
    m = np.array(m.filter(ImageFilter.GaussianBlur(4))).astype(float) / 255
    a = np.array(c)
    al = a[:, :, 3].astype(float) / 255
    rgb = a[:, :, :3].astype(float)
    solid = (al > 0.9).astype(float)
    num = np.stack([blur(rgb[:, :, i] * solid, 5) for i in range(3)], -1)
    den = blur(solid, 5)[..., None]
    fill = np.where(den > 0.05, num / np.maximum(den, 1e-6), rgb)
    a[:, :, :3] = np.where((al < 0.9)[..., None], fill, rgb).clip(0, 255).astype('uint8')
    keep = np.where(al < 0.9, np.clip(blur(solid, 4) * 3, 0, 1), 1)
    a[:, :, 3] = (al * m * keep * 255).astype('uint8')
    out = Image.fromarray(a)
    out = out.crop(out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    w, h = out.size
    s = int(max(w, h) * 1.06)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.alpha_composite(out, ((s - w) // 2, (s - h) // 2))
    return sq.resize((512, 512), Image.LANCZOS)


for expr in ['sleepy', 'content', 'happy', 'beam']:
    head(D + expr + '-cut.webp').save(D + expr + '-head.webp', 'WEBP', quality=88, method=6)
    print('wrote', D + expr + '-head.webp')
