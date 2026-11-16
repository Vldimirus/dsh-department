/**
 * Композиция большого изображения из маленьких спрайтов (слоёв).
 */
import sharp from 'sharp';

/**
 * Собирает PNG из слоёв.
 *
 * @param {object} input Параметры.
 * @param {number} input.width Ширина холста.
 * @param {number} input.height Высота холста.
 * @param {string} [input.background] Цвет фона (#rrggbb) или прозрачный.
 * @param {Array<{ source: string, x: number, y: number, width?: number, height?: number }>} input.layers Слои.
 * @param {string} input.outputPath Куда сохранить.
 * @returns {Promise<{ path: string, width: number, height: number, layers: number }>}
 */
export async function composeImage(input) {
  const width = Math.max(1, Math.min(4096, Number(input.width ?? 512)));
  const height = Math.max(1, Math.min(4096, Number(input.height ?? 512)));
  const background = input.background
    ? { r: parseInt(input.background.slice(1, 3), 16), g: parseInt(input.background.slice(3, 5), 16), b: parseInt(input.background.slice(5, 7), 16), alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };

  const composites = [];
  for (const layer of input.layers ?? []) {
    let image = sharp(layer.source);
    const meta = await image.metadata();
    const targetWidth = layer.width ?? meta.width ?? 1;
    const targetHeight = layer.height ?? meta.height ?? 1;
    image = image.resize(Math.round(targetWidth), Math.round(targetHeight), { kernel: 'nearest' });
    composites.push({
      input: await image.png().toBuffer(),
      left: Math.round(Number(layer.x ?? 0)),
      top: Math.round(Number(layer.y ?? 0)),
    });
  }

  const base = sharp({ create: { width, height, channels: 4, background } });
  const output = composites.length > 0
    ? await base.composite(composites).png().toBuffer()
    : await base.png().toBuffer();
  const { writeFile } = await import('node:fs/promises');
  await writeFile(input.outputPath, output);
  return { path: input.outputPath, width, height, layers: composites.length };
}
