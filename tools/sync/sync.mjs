// Синхронизация каталога мини-приложения с сайтом sl-ls.ru.
// Обходит сайт, собирает товары, виды одежды и уровни, обновляет app/js/catalog.js
// и докачивает фото новых товаров. Уже готовые фото (в том числе из папки sl-phto) не трогает.
//
//   node tools/sync/sync.mjs          — синхронизировать
//   node tools/sync/sync.mjs --dry    — только показать, что изменится
//
// Если сайт ответил странно (не открылся, товаров стало заметно меньше) — ничего не меняет и завершается с ошибкой.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = path.join(ROOT, 'app');
const CATALOG = path.join(APP, 'js', 'catalog.js');
const INDEX = path.join(APP, 'index.html');
const IMAGES_MAP = path.join(ROOT, 'tools', 'sync', 'images.json');
const SITE = 'https://www.sl-ls.ru';
const DELAY = +(process.env.SYNC_DELAY_MS || 1500); // в robots.txt сайта Crawl-delay: 2
const DRY = process.argv.includes('--dry');
const MIN_SHARE = 0.6; // если товаров стало меньше 60% от прежнего — считаем, что сайт ответил с ошибкой

const LEVEL_BY_TITLE = { 'НОВИЧОК': 'novice', 'СПЕЦИАЛИСТ': 'specialist', 'ЭКСПЕРТ': 'expert' };
const FREE_GROUP = '/catalog/besplatnie-vikroyki/';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const decoder = new TextDecoder('windows-1251');
const log = (...a) => console.log(...a);

class SyncError extends Error {}

// ---------- Загрузка ----------
async function fetchBuf(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (StraightLines-miniapp-sync)' }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      last = e;
      await sleep(2000 * (i + 1));
    }
  }
  throw new SyncError(`Не удалось загрузить ${url}: ${last && last.message}`);
}
const fetchPage = async p => decoder.decode(await fetchBuf(SITE + p));

// ---------- Разбор HTML ----------
const ent = s => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
const strip = s => ent(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const h1 = html => strip((html.match(/<div class="page-title"><h1>([\s\S]*?)<\/h1>/) || [])[1] || '');

const isFollowable = p => (p === '/' || /^\/(catalog|product)\//.test(p)) &&
  !/compare|favorites|offers|recent|find|\?|#|\.(pdf|jpe?g|png|gif|webp)$/i.test(p);

function parseListing(html) {
  const i = html.indexOf('class="products-grid"');
  if (i < 0) return { slugs: [], descs: {} };
  const body = html.slice(i, html.indexOf('<footer', i));
  const slugs = [...new Set([...body.matchAll(/href="\/product\/([^/]+)\/" title=/g)].map(m => m[1]))];
  const descs = {};
  for (const m of body.matchAll(/href="\/product\/([^/]+)\/" title=[\s\S]*?<div class="product__description">([\s\S]*?)<\/div>/g)) descs[m[1]] = strip(m[2]);
  return { slugs, descs };
}

function cleanDescription(d) {
  return d.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(\/?)(\w+)[^>]*?(href="[^"]*")?[^>]*>/g, (m, c, t, hr) => {
      t = t.toLowerCase();
      if (!['p', 'ul', 'ol', 'li', 'strong', 'b', 'br', 'a', 'em', 'i'].includes(t)) return '';
      if (t === 'b') t = 'strong';
      if (t === 'a' && !c) return '<a ' + (hr || '') + ' target="_blank">';
      return '<' + c + t + '>';
    })
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/<p>\s*<\/p>/g, '').trim();
}

function parseProduct(html) {
  const imgs = [...new Set([...html.matchAll(/data-src="(\/pictures\/tovar\/original\/[^"]+)" class="product__image-link" data-fancybox="products-full"/g)].map(m => m[1]))];
  const sku = (html.match(/itemprop="sku" content="([^"]*)"/) || [])[1] || '';
  const price = parseFloat((html.match(/itemprop="price" content="([^"]*)"/) || [])[1] || '0');
  const pid = (html.match(/id="tovar_form_price(\d+)"/) || [])[1];
  const old = pid ? parseFloat((html.match(new RegExp('id="tovar_form_price_old' + pid + '">([^<]*)<')) || [])[1] || '0') : 0;
  const status = strip((html.match(/class="product__status status [^"]*tovar_form_nalichie_status_\d+">([\s\S]*?)<\/div>/) || [])[1] || '');
  const selects = [...html.matchAll(/<select class="select" id="tovar_form_variants\d+"[^>]*>([\s\S]*?)<\/select>/g)].map(m => {
    const opts = [...m[1].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
    return { label: strip(opts[0]?.[2] || ''), values: opts.slice(1).map(o => ({ label: strip(o[2]), value: o[1] })) };
  });
  const hash = [...html.matchAll(/option_variant_hash\['([^']+)'\]\['([^']+)'\] = '([^']+)'/g)].map(m => ({ a: m[1], b: m[2], v: m[3] }));
  const variants = hash.length
    ? hash.map(x => { const p = x.v.split('::'); return { opt1: x.a, opt2: x.b, id: p[0], price: +p[1], sku: p[5] }; })
    : (selects[0]?.values || []).map(o => { const p = o.value.split('::'); return { opt1: o.label, id: p[0], price: +p[1], sku: p[5] }; });
  const desc = cleanDescription((html.match(/id="tab_description"[^>]*>([\s\S]*?)<\/div>\s*<div id="tab_response"/) || [])[1] || '');
  const levelTxt = (strip(desc).match(/Уровень сложности\s*:?\s*([^\n.]*?\(\d из 3\))/i) || [])[1] || '';
  return {
    name: h1(html), sku, price, old: old || 0, status, imgs, desc, levelTxt,
    opts: selects.map(s => ({ label: s.label, values: [...new Set(s.values.map(v => v.label))] })),
    variants
  };
}

const levelFromText = t => /эксперт/i.test(t) ? 'expert' : /специалист/i.test(t) ? 'specialist' : /новичок/i.test(t) ? 'novice' : null;

// ---------- Обход сайта ----------
async function crawl() {
  const pages = new Map();
  const queue = ['/'];
  const seen = new Set(queue);
  while (queue.length) {
    const p = queue.shift();
    const html = await fetchPage(p);
    pages.set(p, html);
    for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
      const h = m[1].split('#')[0];
      if (isFollowable(h) && !seen.has(h)) { seen.add(h); queue.push(h); }
    }
    if (pages.size % 20 === 0) log(`  загружено страниц: ${pages.size}`);
    await sleep(DELAY);
  }
  return pages;
}

// ---------- Каталог ----------
function readPrevious() {
  if (!fs.existsSync(CATALOG)) return { types: [], products: [] };
  const w = {};
  new Function('window', fs.readFileSync(CATALOG, 'utf8'))(w);
  return { types: w.SL_TYPES || [], products: w.SL_PRODUCTS || [] };
}

function buildTypes(pages, prevTypes) {
  const home = pages.get('/') || '';
  // порядок разделов — как в меню сайта
  const order = [];
  for (const m of home.matchAll(/href="(\/catalog\/[^"]+\/)"/g)) if (!order.includes(m[1])) order.push(m[1]);

  // страницы каталога: /catalog/группа/, /catalog/группа/вид/, /catalog/группа/вид/уровень/ (+ /pageN/)
  const listings = new Map();
  for (const [p, html] of pages) {
    if (!p.startsWith('/catalog/')) continue;
    const key = p.replace(/page\d+\/$/, '');
    const entry = listings.get(key) || { title: '', slugs: [], descs: {} };
    const { slugs, descs } = parseListing(html);
    if (!/page\d+\/$/.test(p)) entry.title = h1(html);
    for (const s of slugs) if (!entry.slugs.includes(s)) entry.slugs.push(s);
    Object.assign(entry.descs, descs);
    listings.set(key, entry);
  }
  const levelOf = key => LEVEL_BY_TITLE[(listings.get(key)?.title || '').toUpperCase()] || null;
  const depth = key => key.split('/').filter(Boolean).length; // catalog=1, группа=2, вид=3, уровень=4
  const children = key => [...listings.keys()].filter(k => k !== key && k.startsWith(key) && depth(k) === depth(key) + 1);
  const withLevels = key => {
    const set = new Set(listings.get(key)?.slugs || []);
    for (const c of children(key)) for (const s of listings.get(c).slugs) set.add(s);
    return [...set];
  };
  const sortByMenu = keys => keys.sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9));

  const prevIdByUrl = Object.fromEntries(prevTypes.map(t => [t.url, t.id]));
  const usedIds = new Set();
  const makeId = url => {
    let id = prevIdByUrl[url] || url.split('/').filter(Boolean).pop().replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    while (usedIds.has(id)) id += '-2';
    usedIds.add(id);
    return id;
  };

  const types = [];
  const groups = sortByMenu([...listings.keys()].filter(k => depth(k) === 2 && !levelOf(k)));
  for (const g of groups) {
    const groupTitle = listings.get(g).title;
    const subs = sortByMenu(children(g).filter(k => !levelOf(k)));
    // бесплатные выкройки и разделы без подразделов — один вид целиком
    if (g === FREE_GROUP || !subs.length) {
      const items = withLevels(g);
      for (const s of subs) for (const x of withLevels(s)) if (!items.includes(x)) items.push(x);
      if (items.length) types.push({ id: makeId(g), title: groupTitle, group: groupTitle, url: g, free: g === FREE_GROUP, items });
      continue;
    }
    for (const s of subs) {
      const items = withLevels(s);
      if (items.length) types.push({ id: makeId(s), title: listings.get(s).title, group: groupTitle, url: s, items });
    }
  }

  // уровень по разделам «Новичок/Специалист/Эксперт», если в описании товара его нет
  const listingLevel = {};
  for (const [k, v] of listings) { const l = levelOf(k); if (l) for (const s of v.slugs) listingLevel[s] ??= l; }
  const shortDesc = {};
  for (const v of listings.values()) for (const [s, d] of Object.entries(v.descs)) shortDesc[s] ??= d;
  return { types, listingLevel, shortDesc };
}

async function toWebp(buf, full, thumb) {
  if (!sharp) sharp = (await import('sharp')).default;
  const img = sharp(buf, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' });
  await img.clone().resize(1200, 1500, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(full);
  await sharp(full).resize(480, 600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumb);
  const meta = await sharp(full).metadata();
  return { w: meta.width, h: meta.height };
}
let sharp = null;

async function main() {
  const t0 = Date.now();
  const prev = readPrevious();
  const imagesMap = fs.existsSync(IMAGES_MAP) ? JSON.parse(fs.readFileSync(IMAGES_MAP, 'utf8')) : {};
  const prevImgSize = {};
  for (const p of prev.products) for (const im of p.imgs) prevImgSize[im.f] = { w: im.w, h: im.h };

  log('Обход сайта…');
  const pages = await crawl();
  const productPages = [...pages.keys()].filter(p => p.startsWith('/product/'));
  log(`Страниц: ${pages.size}, товаров: ${productPages.length}`);

  const { types, listingLevel, shortDesc } = buildTypes(pages, prev.types);

  // порядок товаров — как в разделах сайта
  const order = [];
  for (const t of types) for (const s of t.items) if (!order.includes(s)) order.push(s);
  for (const p of productPages) { const s = p.split('/')[2]; if (!order.includes(s)) order.push(s); }

  const minCount = Math.max(5, Math.ceil(prev.products.length * MIN_SHARE));
  if (order.length < minCount) throw new SyncError(`На сайте найдено ${order.length} товаров, а было ${prev.products.length} — похоже на сбой сайта, каталог не меняю`);

  const products = [];
  let downloaded = 0;
  for (const slug of order) {
    const html = pages.get(`/product/${slug}/`);
    if (!html) throw new SyncError(`Нет страницы товара /product/${slug}/`);
    const p = parseProduct(html);
    if (!p.name) throw new SyncError(`Не удалось разобрать /product/${slug}/`);
    const id = slug.replace(/[^a-z0-9-]/gi, '-');
    const imgs = [];
    for (const url of p.imgs) {
      let entry = imagesMap[url];
      const exists = entry && fs.existsSync(path.join(APP, 'img/p', entry.f)) && fs.existsSync(path.join(APP, 'img/t', entry.f));
      if (exists && prevImgSize[entry.f]) { imgs.push({ f: entry.f, ...prevImgSize[entry.f] }); continue; }
      const f = exists ? entry.f : `${id}-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 8)}.webp`;
      if (DRY) { imgs.push({ f, w: 0, h: 0 }); downloaded++; continue; }
      const buf = await fetchBuf(SITE + encodeURI(url.replace('/original/', '/big/')));
      const size = await toWebp(buf, path.join(APP, 'img/p', f), path.join(APP, 'img/t', f));
      imagesMap[url] = { f, src: entry ? entry.src : 'site' };
      imgs.push({ f, ...size });
      downloaded++;
      await sleep(500);
    }
    products.push({
      id, url: `/product/${slug}/`, name: p.name.replace(/"([^"]+)"/g, '«$1»'), sku: p.sku, price: p.price, old: p.old, status: p.status,
      level: levelFromText(p.levelTxt) || listingLevel[slug] || null,
      types: types.filter(t => t.items.includes(slug)).map(t => t.id),
      short: shortDesc[slug] || '', opts: p.opts, variants: p.variants, imgs, desc: p.desc
    });
  }

  // товары без раздела не должны пропасть из каталога
  if (products.some(p => !p.types.length)) {
    types.push({ id: 'drugoe', title: 'Другое', group: 'Другое', url: '/catalog/', items: [] });
    for (const p of products) if (!p.types.length) p.types.push('drugoe');
  }
  const typesOut = types.map(({ items, ...t }) => (t.free ? t : (({ free, ...rest }) => rest)(t)));

  const content = '// Сгенерировано из данных сайта sl-ls.ru (tools/sync/sync.mjs)\n' +
    'window.SL_TYPES = ' + JSON.stringify(typesOut, null, 1) + ';\n' +
    'window.SL_PRODUCTS = ' + JSON.stringify(products, null, 1) + ';\n';

  // ---------- Что изменилось ----------
  const prevById = Object.fromEntries(prev.products.map(p => [p.id, p]));
  const newIds = new Set(products.map(p => p.id));
  const added = products.filter(p => !prevById[p.id]).map(p => p.name);
  const removed = prev.products.filter(p => !newIds.has(p.id)).map(p => p.name);
  const changed = [];
  for (const p of products) {
    const o = prevById[p.id];
    if (!o) continue;
    const diff = ['name', 'price', 'old', 'status', 'level', 'sku', 'short', 'desc'].filter(k => JSON.stringify(o[k]) !== JSON.stringify(p[k]));
    if (JSON.stringify(o.types) !== JSON.stringify(p.types)) diff.push('types');
    if (JSON.stringify(o.variants) !== JSON.stringify(p.variants) || JSON.stringify(o.opts) !== JSON.stringify(p.opts)) diff.push('variants');
    if (JSON.stringify(o.imgs.map(i => i.f)) !== JSON.stringify(p.imgs.map(i => i.f))) diff.push('imgs');
    if (diff.length) changed.push(`${p.name}: ${diff.join(', ')}${diff.includes('price') ? ` (${o.price} → ${p.price})` : ''}`);
  }
  const old = fs.existsSync(CATALOG) ? fs.readFileSync(CATALOG, 'utf8') : '';
  const same = old.replace(/^\/\/.*\n/, '') === content.replace(/^\/\/.*\n/, '');

  const lines = [
    `Товаров: ${products.length} (было ${prev.products.length}), видов одежды: ${typesOut.length}`,
    added.length ? `Новые: ${added.join('; ')}` : '',
    removed.length ? `Убраны: ${removed.join('; ')}` : '',
    changed.length ? `Изменены:\n  ${changed.join('\n  ')}` : '',
    downloaded ? `Новых фото: ${downloaded}` : '',
    same ? 'Изменений нет.' : '',
    `Время: ${Math.round((Date.now() - t0) / 1000)} с`
  ].filter(Boolean);
  log('\n' + lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Синхронизация каталога\n\n```\n' + lines.join('\n') + '\n```\n');

  if (same || DRY) return;

  fs.writeFileSync(CATALOG, content);
  fs.writeFileSync(IMAGES_MAP, JSON.stringify(imagesMap, null, 1));
  // номер версии каталога в index.html — чтобы Telegram не показывал старую версию из кэша
  const v = crypto.createHash('sha1').update(content).digest('hex').slice(0, 8);
  fs.writeFileSync(INDEX, fs.readFileSync(INDEX, 'utf8').replace(/js\/catalog\.js\?v=[^"]*/, 'js/catalog.js?v=' + v));
  // удаляем фото товаров, которых больше нет
  const used = new Set(products.flatMap(p => p.imgs.map(i => i.f)));
  for (const dir of ['img/p', 'img/t']) for (const f of fs.readdirSync(path.join(APP, dir))) if (f.endsWith('.webp') && !used.has(f)) fs.unlinkSync(path.join(APP, dir, f));
  log('Каталог обновлён.');
}

main().catch(e => {
  console.error('\nСинхронизация остановлена: ' + e.message + (e instanceof SyncError ? '' : '\n' + e.stack));
  process.exit(1);
});
