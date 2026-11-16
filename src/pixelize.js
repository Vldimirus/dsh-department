/**
 * Превращает изображение (PNG/JPEG/WebP) в пиксельную сетку и PNG-спрайт.
 * Художник может взять сетку и подправить пиксели вручную через dept_art.
 */
import sharp from 'sharp';
import { encodePng } from './png.js';

const SYMBOLS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Ближайший цвет палитры.
 *
 * @param {number} r Красный.
 * @param {number} g Зелёный.
 * @param {number} b Синий.
 * @param {Array<{ r: number, g: number, b: number }>} palette Палитра.
 * @returns {number} Индекс.
 */
function nearest(r, g, b, palette) {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < palette.length; index += 1) {
    const color = palette[index];
    const distance = (color.r - r) ** 2 + (color.g - g) ** 2 + (color.b - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/**
 * Пикселизирует изображение.
 *
 * @param {object} input Параметры.
 * @param {string} input.source Путь к исходному изображению.
 * @param {string} input.outputPath Куда сохранить PNG.
 * @param {number} [input.width] Ширина сетки.
 * @param {number} [input.height] Высота сетки.
 * @param {number} [input.colors] Число цветов (2–64).
 * @param {number} [input.scale] Масштаб выходного PNG.
 * @param {Record<string, string>} [input.palette] Принудительная палитра (символ → #rrggbb).
 * @returns {Promise<{ path: string, width: number, height: number, rows: string[], palette: Record<string, string> }>}
 */
export async function pixelize(input) {
  const meta = await sharp(input.source).metadata();
  const aspect = (meta.height ?? 1) / (meta.width ?? 1);
  const width = Math.max(4, Math.min(96, Number(input.width ?? 32)));
  const height = Math.max(4, Math.min(96, Number(input.height ?? Math.round(width * aspect))));
  const colors = Math.max(2, Math.min(64, Number(input.colors ?? 16)));
  const scale = Math.max(1, Math.min(16, Number(input.scale ?? 4)));

  let forced = null;
  if (input.palette && typeof input.palette === 'object') {
    forced = Object.entries(input.palette).map(([char, value]) => {
      const hex = String(value).replace('#', '');
      return { char, r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
    });
  }

  const quantized = await sharp(input.source)
    .resize(width, height, { fit: 'fill', kernel: 'nearest' })
    .ensureAlpha()
    .png({ palette: true, colours: colors, dither: 0 })
    .toBuffer();
  const { data, info } = await sharp(quantized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const pixels = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      pixels.push({ x, y, r: data[offset], g: data[offset + 1], b: data[offset + 2], a: data[offset + 3] });
    }
  }

  let palette;
  if (forced) {
    palette = forced;
  } else {
    const seen = new Map();
    for (const pixel of pixels) {
      if (pixel.a < 16) continue;
      const key = pixel.r + ',' + pixel.g + ',' + pixel.b;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const sorted = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, colors);
    palette = sorted.map(([key], index) => {
      const [r, g, b] = key.split(',').map(Number);
      return { char: SYMBOLS[index % SYMBOLS.length], r, g, b };
    });
  }

  const rows = [];
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    let line = '';
    for (let x = 0; x < width; x += 1) {
      const pixel = pixels[y * width + x];
      if (pixel.a < 16) {
        line += '.';
        continue;
      }
      const index = nearest(pixel.r, pixel.g, pixel.b, palette);
      line += palette[index].char;
      const offset = (y * width + x) * 4;
      rgba[offset] = palette[index].r;
      rgba[offset + 1] = palette[index].g;
      rgba[offset + 2] = palette[index].b;
      rgba[offset + 3] = 255;
    }
    rows.push(line);
  }

  const scaled = new Uint8Array(width * scale * height * scale * 4);
  for (let y = 0; y < height * scale; y += 1) {
    for (let x = 0; x < width * scale; x += 1) {
      const src = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 4;
      const dst = (y * width * scale + x) * 4;
      scaled[dst] = rgba[src];
      scaled[dst + 1] = rgba[src + 1];
      scaled[dst + 2] = rgba[src + 2];
      scaled[dst + 3] = rgba[src + 3];
    }
  }
  const { writeFile } = await import('node:fs/promises');
  await writeFile(input.outputPath, encodePng(width * scale, height * scale, scaled));

  const paletteOut = {};
  for (const color of palette) {
    paletteOut[color.char] = '#' + [color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, '0')).join('');
  }
  return { path: input.outputPath, width, height, rows, palette: paletteOut };
}
