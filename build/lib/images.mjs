/**
 * Image pipeline for recipe photos.
 *
 * Convention:
 *   content/images/recipes/<slug>/hero.jpg   → recipe hero image
 *   content/images/recipes/<slug>/step-N.jpg → step N image (1-indexed)
 *
 * Output:
 *   assets/images/recipes/<slug>/<name>-<width>.<ext>
 *
 * For each source jpeg we emit AVIF + WebP + a JPEG fallback at three widths
 * (480, 960, 1600). We content-hash the source file and skip any variant whose
 * hash matches the cached value. EXIF is stripped; sRGB profile preserved.
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const WIDTHS = [480, 960, 1600];
const SOURCE_EXTS = new Set(['.jpg', '.jpeg', '.png']);
const CACHE_FILE = '.image-cache.json';

function hashFile(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

async function loadCache(cacheDir) {
  const path = join(cacheDir, CACHE_FILE);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return {};
  }
}

async function saveCache(cacheDir, cache) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, CACHE_FILE), JSON.stringify(cache, null, 2));
}

/**
 * Scan content/images/recipes/<slug>/ folders.
 * Returns Map<slug, { hero?: string, steps: { [n]: string } }> with absolute paths.
 */
export async function scanRecipeImages(root) {
  const baseDir = join(root, 'content', 'images', 'recipes');
  const out = new Map();
  if (!existsSync(baseDir)) return out;

  const slugDirs = await readdir(baseDir, { withFileTypes: true });
  for (const d of slugDirs) {
    if (!d.isDirectory()) continue;
    const slug = d.name;
    const slugPath = join(baseDir, slug);
    const files = await readdir(slugPath);
    const entry = { hero: null, steps: {} };
    for (const f of files) {
      const ext = extname(f).toLowerCase();
      if (!SOURCE_EXTS.has(ext)) continue;
      const name = basename(f, extname(f));
      if (name === 'hero') {
        entry.hero = join(slugPath, f);
      } else {
        const m = name.match(/^step-(\d+)$/);
        if (m) entry.steps[parseInt(m[1], 10)] = join(slugPath, f);
      }
    }
    if (entry.hero || Object.keys(entry.steps).length) out.set(slug, entry);
  }
  return out;
}

/**
 * Process a single source image into responsive variants.
 * Returns { srcset: { avif, webp, jpeg }, width, height, blurDataUri }.
 */
async function processOne(sourcePath, outDir, baseName, cache) {
  const buf = await readFile(sourcePath);
  const hash = hashFile(buf);
  const cacheKey = `${baseName}:${hash}`;
  const cached = cache[cacheKey];

  // Read intrinsic dimensions for layout (used for aspect-ratio reservation).
  const meta = await sharp(buf).metadata();
  const intrinsic = { width: meta.width, height: meta.height };

  if (cached && cached.intrinsic) {
    return { ...cached, _hit: true };
  }

  await mkdir(outDir, { recursive: true });

  const variants = { avif: [], webp: [], jpeg: [] };
  for (const w of WIDTHS) {
    if (intrinsic.width < w * 0.9) continue; // do not upscale
    const base = sharp(buf, { failOn: 'none' })
      .rotate() // honor EXIF orientation, then strip metadata
      .resize({ width: w, withoutEnlargement: true });

    const avifPath = join(outDir, `${baseName}-${w}.avif`);
    const webpPath = join(outDir, `${baseName}-${w}.webp`);
    const jpegPath = join(outDir, `${baseName}-${w}.jpg`);

    await Promise.all([
      base.clone().avif({ quality: 55, effort: 4 }).toFile(avifPath),
      base.clone().webp({ quality: 78 }).toFile(webpPath),
      base.clone().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(jpegPath),
    ]);

    variants.avif.push({ width: w, path: avifPath });
    variants.webp.push({ width: w, path: webpPath });
    variants.jpeg.push({ width: w, path: jpegPath });
  }

  // If no resized variant fit (very small source), still emit one of each at native width.
  if (!variants.jpeg.length) {
    const w = intrinsic.width;
    const avifPath = join(outDir, `${baseName}-${w}.avif`);
    const webpPath = join(outDir, `${baseName}-${w}.webp`);
    const jpegPath = join(outDir, `${baseName}-${w}.jpg`);
    const base = sharp(buf, { failOn: 'none' }).rotate();
    await Promise.all([
      base.clone().avif({ quality: 55 }).toFile(avifPath),
      base.clone().webp({ quality: 78 }).toFile(webpPath),
      base.clone().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(jpegPath),
    ]);
    variants.avif.push({ width: w, path: avifPath });
    variants.webp.push({ width: w, path: webpPath });
    variants.jpeg.push({ width: w, path: jpegPath });
  }

  // Tiny base64 LQIP for blur-up. 16px wide, blurred, JPEG.
  const blurBuf = await sharp(buf).rotate().resize({ width: 16 }).jpeg({ quality: 50 }).toBuffer();
  const blurDataUri = `data:image/jpeg;base64,${blurBuf.toString('base64')}`;

  const result = {
    intrinsic,
    variants: {
      avif: variants.avif.map(v => ({ width: v.width })),
      webp: variants.webp.map(v => ({ width: v.width })),
      jpeg: variants.jpeg.map(v => ({ width: v.width })),
    },
    blurDataUri,
    hash,
  };
  cache[cacheKey] = result;
  return result;
}

/**
 * Build all recipe images. Returns Map<slug, { hero?: ImgData, steps: {N: ImgData} }>.
 * ImgData = { intrinsic, variants, blurDataUri, baseName, slug, kind }.
 */
export async function buildRecipeImages(root) {
  const sources = await scanRecipeImages(root);
  if (!sources.size) return new Map();

  const outRoot = join(root, 'assets', 'images', 'recipes');
  const cacheDir = join(root, 'data', '_cache');
  const cache = await loadCache(cacheDir);

  const result = new Map();
  let processed = 0;
  let cacheHits = 0;

  for (const [slug, entry] of sources) {
    const slugOut = join(outRoot, slug);
    const slugResult = { hero: null, steps: {} };

    if (entry.hero) {
      const r = await processOne(entry.hero, slugOut, 'hero', cache);
      if (r._hit) cacheHits++; else processed++;
      slugResult.hero = { ...r, baseName: 'hero', slug, kind: 'hero' };
    }
    for (const [n, src] of Object.entries(entry.steps)) {
      const baseName = `step-${n}`;
      const r = await processOne(src, slugOut, baseName, cache);
      if (r._hit) cacheHits++; else processed++;
      slugResult.steps[n] = { ...r, baseName, slug, kind: 'step', stepIndex: parseInt(n, 10) };
    }
    result.set(slug, slugResult);
  }

  await saveCache(cacheDir, cache);
  console.log(`  images: ${processed} processed, ${cacheHits} cached`);
  return result;
}

/**
 * Render a responsive <picture> element.
 *
 * @param img       - ImgData from buildRecipeImages
 * @param opts      - { sizes, alt, className, eager, fetchPriority, aspect }
 * @param relTo     - relative path base for the rendered HTML page
 */
export function renderPicture(img, opts = {}, relTo = '') {
  if (!img) return '';
  const sizes = opts.sizes || '(min-width: 900px) 50vw, 100vw';
  const alt = (opts.alt || '').replace(/"/g, '&quot;');
  const cls = opts.className || 'recipe-img';
  const loading = opts.eager ? 'eager' : 'lazy';
  const decoding = opts.eager ? 'sync' : 'async';
  const fetchPriority = opts.fetchPriority ? ` fetchpriority="${opts.fetchPriority}"` : '';
  const aspect = opts.aspect || `${img.intrinsic.width} / ${img.intrinsic.height}`;

  const baseHref = `assets/images/recipes/${img.slug}/${img.baseName}`;
  const prefix = relTo || '';

  const srcset = (variants, ext) => variants.map(v => `${prefix}${baseHref}-${v.width}.${ext} ${v.width}w`).join(', ');
  const fallback = img.variants.jpeg[img.variants.jpeg.length - 1];
  const fallbackSrc = `${prefix}${baseHref}-${fallback.width}.jpg`;

  return `<picture class="${cls}-pic">
    <source type="image/avif" srcset="${srcset(img.variants.avif, 'avif')}" sizes="${sizes}">
    <source type="image/webp" srcset="${srcset(img.variants.webp, 'webp')}" sizes="${sizes}">
    <img class="${cls}" src="${fallbackSrc}" srcset="${srcset(img.variants.jpeg, 'jpg')}" sizes="${sizes}"
      width="${img.intrinsic.width}" height="${img.intrinsic.height}"
      loading="${loading}" decoding="${decoding}"${fetchPriority}
      alt="${alt}"
      style="aspect-ratio: ${aspect}; background-image: url(${img.blurDataUri}); background-size: cover; background-position: center;">
  </picture>`;
}

/**
 * Compute relative path prefix from a generated page back to repo root.
 * pages/recipes/foo.html → "../../"
 */
export function relPrefixFor(pagePath) {
  const depth = pagePath.split('/').length - 1;
  return '../'.repeat(depth);
}
