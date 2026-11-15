/**
 * Схема проекта: файлы, связи импортов, размеры.
 *
 * Поддерживаются JS/TS (import/require), C/C++ (#include) и Python (import/from).
 * Связи разрешаются только в существующие файлы проекта.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.dsh', 'docs', 'assets', 'dist', 'build', 'out', '.cache']);

/**
 * Собирает схему проекта.
 *
 * @param {string} root Корень проекта.
 * @param {{ maxFiles?: number }} [options] Ограничения.
 * @returns {Promise<object>}
 */
export async function buildBlueprint(root, options = {}) {
  const maxFiles = Number(options.maxFiles ?? 400);
  const files = [];
  await walk(root, root, files, maxFiles);
  const byPath = new Map(files.map((file) => [file.abs, file]));
  const known = new Set(files.map((file) => file.abs));
  const edges = [];
  for (const file of files) {
    file.imports = [];
    for (const raw of await importsOf(file)) {
      const target = resolveImport(root, file, raw, known);
      if (!target) continue;
      const targetFile = byPath.get(target);
      if (!targetFile || targetFile.abs === file.abs) continue;
      file.imports.push(targetFile.rel);
      edges.push({ from: file.rel, to: targetFile.rel });
    }
  }
  const dirs = new Map();
  for (const file of files) {
    const dir = file.rel.split(sep)[0] === file.rel ? '.' : file.rel.slice(0, file.rel.lastIndexOf(sep));
    dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
  }
  return {
    root,
    files: files.map((file) => ({ path: file.rel, dir: file.rel.slice(0, Math.max(0, file.rel.lastIndexOf(sep))) || '.', loc: file.loc, imports: file.imports })),
    edges,
    stats: { files: files.length, loc: files.reduce((sum, file) => sum + file.loc, 0), dirs: [...dirs].map(([dir, count]) => ({ dir, count })) },
  };
}

async function walk(root, dir, out, maxFiles) {
  if (out.length >= maxFiles) return;
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= maxFiles) return;
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(root, full, out, maxFiles);
      continue;
    }
    if (!CODE_EXT.has(extname(entry.name))) continue;
    try {
      const info = await stat(full);
      if (info.size > 512 * 1024) continue;
      const text = await readFile(full, 'utf8');
      out.push({ abs: full, rel: relative(root, full), loc: text.split('\n').length, text });
    } catch {
      // нечитаемые файлы пропускаем
    }
  }
}

async function importsOf(file) {
  const ext = extname(file.abs);
  const found = [];
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'].includes(ext)) {
    const pattern = /(?:import\s[^'"]*?from\s*|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
    let match;
    while ((match = pattern.exec(file.text)) !== null) found.push(match[1]);
  } else if (['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp'].includes(ext)) {
    const pattern = /#include\s*["<]([^">]+)[">]/g;
    let match;
    while ((match = pattern.exec(file.text)) !== null) found.push(match[1]);
  } else if (ext === '.py') {
    const pattern = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm;
    let match;
    while ((match = pattern.exec(file.text)) !== null) found.push(match[1] ?? match[2]);
  }
  return found;
}

function resolveImport(root, file, raw, known) {
  if (!raw || raw.startsWith('node:') || raw.startsWith('http')) return null;
  const baseDir = file.abs.slice(0, file.abs.lastIndexOf(sep));
  if (!raw.startsWith('.') && !raw.startsWith('/')) {
    // не относительный импорт (пакет) — пропускаем, но для C++ ищем рядом
    if (!raw.includes('/')) return null;
  }
  const candidate = raw.startsWith('/') ? join(root, raw) : resolve(baseDir, raw);
  const variants = [candidate, `${candidate}.js`, `${candidate}.mjs`, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.py`, `${candidate}.cpp`, join(candidate, 'index.js'), join(candidate, 'index.ts')];
  for (const variant of variants) {
    if (known.has(variant)) return variant;
  }
  return null;
}
