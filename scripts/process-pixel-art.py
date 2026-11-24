#!/usr/bin/env python3
"""
Anti-AI Pixel Art Post-Processor & QA Gate for Battle for America 2028.
Enforces ART_STYLE_GUIDE.md:
  - Flood-fill chroma/background removal from corners (green-key or solid backdrop)
  - Green-spill & warm/yellow cast suppression
  - Strict binary alpha (0 or 255 only — zero semi-transparent edge halo)
  - Exact integer pixel-grid snap (96x96 portraits anchored to bottom; 64x64 icons centered)
  - Palette quantization (flat clustered colors, zero soft gradients)
  - Clean 1px outer silhouette contour (#000000 for portraits, #101828 for icons)
  - Automated QA check (--check)
"""

import argparse
import collections
import glob
import os
import sys
import numpy as np
from PIL import Image


def flood_remove_background(rgb: np.ndarray, tol: float = 52.0) -> np.ndarray:
    """Flood-fill from the 4 image corners to build a foreground binary mask."""
    h, w, _ = rgb.shape
    corners = np.array([
        rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1],
        rgb[0, w // 2], rgb[h // 2, 0], rgb[h // 2, w - 1],
    ], dtype=np.float32)
    # Pick median corner color as key color
    key = np.median(corners, axis=0)
    is_green_key = (key[1] > key[0] + 35) and (key[1] > key[2] + 35)

    # Distance of every pixel to key color
    diff = np.linalg.norm(rgb.astype(np.float32) - key[None, None, :], axis=2)
    if is_green_key:
        # Also catch slightly darker/lighter chroma-green shades around edges
        green_dom = rgb[:, :, 1].astype(np.float32) - np.maximum(rgb[:, :, 0], rgb[:, :, 2]).astype(np.float32)
        bg_candidate = (diff < tol) | (green_dom > 32.0)
    else:
        bg_candidate = diff < tol

    visited = np.zeros((h, w), dtype=bool)
    q = collections.deque()
    for y in (0, h - 1):
        for x in range(w):
            if bg_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for x in (0, w - 1):
        for y in range(h):
            if bg_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_candidate[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    # Also remove enclosed pure chroma-key holes (e.g., between columns, abacus rods, scale chains)
    if is_green_key:
        pure_key = (diff < 45.0) & (green_dom > 70.0)
        visited = visited | pure_key
    elif (key[0] > 200 and key[2] > 200 and key[1] < 60):
        # Pure magenta key
        pure_mag = (diff < 45.0) & (rgb[:, :, 0] > 180) & (rgb[:, :, 2] > 180) & (rgb[:, :, 1] < 80)
        visited = visited | pure_mag
    fg = ~visited
    return fg, is_green_key


def suppress_green_spill(rgb: np.ndarray, fg: np.ndarray) -> np.ndarray:
    """Despill bright chroma-green fringes ONLY on the outer 3px boundary of foreground."""
    out = rgb.copy().astype(np.float32)
    # Build 3px inner edge band next to background
    bg = ~fg
    near_bg = bg.copy()
    for _ in range(3):
        p = np.pad(near_bg, 1, mode='constant', constant_values=True)
        near_bg = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | near_bg
    edge_fg = fg & near_bg
    r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    max_rb = np.maximum(r, b)
    spill = edge_fg & (g > max_rb + 18) & (g > 110)
    out[spill, 1] = max_rb[spill] + 4.0
    return np.clip(out, 0, 255).astype(np.uint8)


def neutralize_yellow_cast(rgb: np.ndarray, fg: np.ndarray) -> np.ndarray:
    """Gently correct warm/sepia AI tint if bright neutral pixels have R >> B."""
    out = rgb.astype(np.float32)
    bright = fg & (out[:, :, 0] > 185) & (out[:, :, 1] > 180) & (out[:, :, 2] > 140)
    if bright.sum() >= 30:
        rb_diff = float(np.median(out[bright, 0] - out[bright, 2]))
        if rb_diff > 12.0:
            # Neutralize subtle yellow/amber wash without distorting skin tones
            shift = min(14.0, (rb_diff - 8.0) * 0.5)
            out[:, :, 2] = np.clip(out[:, :, 2] + shift, 0, 255)
            out[:, :, 0] = np.clip(out[:, :, 0] - shift * 0.25, 0, 255)
    return np.clip(out, 0, 255).astype(np.uint8)


def strip_isolated_pixels(mask: np.ndarray) -> np.ndarray:
    """Remove stray 1px floating dots with 0 or 1 orthogonal neighbors."""
    h, w = mask.shape
    padded = np.pad(mask.astype(np.uint8), 1, mode='constant')
    neighbors = (
        padded[:-2, 1:-1] + padded[2:, 1:-1] +
        padded[1:-1, :-2] + padded[1:-1, 2:]
    )
    return mask & (neighbors >= 2)


def add_outer_contour(rgba: np.ndarray, outline_rgb=(0, 0, 0)) -> np.ndarray:
    """Ensure a crisp 1px outer silhouette contour around opaque pixels."""
    h, w, _ = rgba.shape
    alpha = rgba[:, :, 3] > 0
    padded = np.pad(alpha, 1, mode='constant')
    dilated = (
        padded[:-2, 1:-1] | padded[2:, 1:-1] |
        padded[1:-1, :-2] | padded[1:-1, 2:]
    )
    border = dilated & (~alpha)
    out = rgba.copy()
    out[border, 0] = outline_rgb[0]
    out[border, 1] = outline_rgb[1]
    out[border, 2] = outline_rgb[2]
    out[border, 3] = 255
    return out


def process_image(src_path: str, dst_path: str, mode: str = 'portrait'):
    im = Image.open(src_path).convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3]

    # Check if already has clean transparency
    if (arr[:, :, 3] == 0).sum() > (arr.shape[0] * arr.shape[1] * 0.12):
        fg = arr[:, :, 3] >= 128
        is_green = False
    else:
        fg, is_green = flood_remove_background(rgb)

    if is_green:
        rgb = suppress_green_spill(rgb, fg)
    rgb = neutralize_yellow_cast(rgb, fg)

    ys, xs = np.where(fg)
    if len(ys) == 0:
        raise ValueError(f'No foreground pixels detected in {src_path}')
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1

    # Build tight RGBA crop with ZERO background RGB bleed (mask bg to 0 before RGBA BOX resize)
    fg_crop = fg[y0:y1, x0:x1]
    crop_rgba = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    crop_rgba[:, :, :3] = np.where(fg_crop[:, :, None], rgb[y0:y1, x0:x1], 0)
    crop_rgba[:, :, 3] = np.where(fg_crop, 255, 0)
    crop_im = Image.fromarray(crop_rgba, 'RGBA')

    def premul_downscale(im_rgba, nw, nh):
        # PIL RGBA resize automatically uses premultiplied alpha so transparent pixels NEVER bleed color!
        resized = im_rgba.resize((nw, nh), Image.Resampling.BOX)
        r_arr = np.array(resized)
        a_bin = (r_arr[:, :, 3] >= 145)
        a_bin = strip_isolated_pixels(a_bin)
        return r_arr[:, :, :3], a_bin

    if mode == 'portrait':
        target_size = 96
        max_w = 90
        max_h = 91
        scale = min(max_w / crop_im.width, max_h / crop_im.height)
        nw = max(1, int(round(crop_im.width * scale)))
        nh = max(1, int(round(crop_im.height * scale)))
        rgb_small, a_bin = premul_downscale(crop_im, nw, nh)

        canvas = np.zeros((target_size, target_size, 4), dtype=np.uint8)
        ox = (target_size - nw) // 2
        oy = target_size - nh
        canvas[oy:oy + nh, ox:ox + nw, :3] = np.where(a_bin[:, :, None], rgb_small, 0)
        canvas[oy:oy + nh, ox:ox + nw, 3] = np.where(a_bin, 255, 0)
        max_colors = 34
        outline_rgb = (0, 0, 0)
    else:
        target_size = 64
        max_dim = 54
        scale = min(max_dim / crop_im.width, max_dim / crop_im.height)
        nw = max(1, int(round(crop_im.width * scale)))
        nh = max(1, int(round(crop_im.height * scale)))
        rgb_small, a_bin = premul_downscale(crop_im, nw, nh)

        canvas = np.zeros((target_size, target_size, 4), dtype=np.uint8)
        ox = (target_size - nw) // 2
        oy = (target_size - nh) // 2
        canvas[oy:oy + nh, ox:ox + nw, :3] = np.where(a_bin[:, :, None], rgb_small, 0)
        canvas[oy:oy + nh, ox:ox + nw, 3] = np.where(a_bin, 255, 0)
        max_colors = 26
        outline_rgb = (16, 24, 40)

    # Quantize foreground colors cleanly using median-cut on opaque pixels
    opaque_mask = canvas[:, :, 3] > 0
    rgb_canvas = Image.fromarray(canvas[:, :, :3], 'RGB')
    quant = rgb_canvas.quantize(colors=max_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    q_arr = np.array(quant)
    canvas[:, :, :3] = np.where(opaque_mask[:, :, None], q_arr, 0)

    # Add crisp 1px outer silhouette contour
    canvas = add_outer_contour(canvas, outline_rgb=outline_rgb)
    # Keep bottom row of portraits flush (no clipping needed since oy = 96 - nh)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    Image.fromarray(canvas, 'RGBA').save(dst_path, 'PNG', optimize=True)


def check_directory(directory: str, expected_size: int) -> int:
    files = sorted(glob.glob(os.path.join(directory, '*.png')))
    errors = 0
    for path in files:
        im = Image.open(path)
        arr = np.array(im.convert('RGBA'))
        a = arr[:, :, 3]
        partial = int(((a > 0) & (a < 255)).sum())
        corners = [int(a[0, 0]), int(a[0, -1]), int(a[-1, 0]), int(a[-1, -1])]
        issues = []
        if im.size != (expected_size, expected_size):
            issues.append(f'size={im.size}')
        if im.mode != 'RGBA':
            issues.append(f'mode={im.mode}')
        if partial > 0:
            issues.append(f'partial_alpha={partial}')
        if corners[0] != 0 or corners[1] != 0:
            issues.append(f'top_corners={corners[:2]}')
        if issues:
            print(f'FAIL {path}: {", ".join(issues)}')
            errors += 1
    print(f'QA {directory}: checked {len(files)} PNGs, {errors} errors.')
    return errors


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--src', help='Source generated image path')
    p.add_argument('--dst', help='Output processed PNG path')
    p.add_argument('--mode', choices=['portrait', 'icon'], default='portrait')
    p.add_argument('--check', help='Directory to run QA check on')
    p.add_argument('--size', type=int, default=96)
    args = p.parse_args()

    if args.check:
        sys.exit(1 if check_directory(args.check, args.size) else 0)
    if not args.src or not args.dst:
        p.error('--src and --dst are required unless --check is specified')
    process_image(args.src, args.dst, mode=args.mode)
    print(f'Processed {args.src} -> {args.dst} ({args.mode})')


if __name__ == '__main__':
    main()
