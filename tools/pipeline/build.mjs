import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const [S, LOCAL, APP] = process.argv.slice(2);
const prods = JSON.parse(fs.readFileSync(path.join(S,'products.json'),'utf8'));
const listing = JSON.parse(fs.readFileSync(path.join(S,'listing.json'),'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(S,'plan.json'),'utf8'));
const TYPES = [
  ['platya','Платья','Платья и сарафаны','catalog__platya-sarafani__platya'],
  ['sarafany','Сарафаны','Платья и сарафаны','catalog__platya-sarafani__sarafani'],
  ['bluzy','Блузы','Рубашки, блузы и джемперы','catalog__rubashki-bluzi-jampera__bluzi'],
  ['dzhempery','Джемперы','Рубашки, блузы и джемперы','catalog__rubashki-bluzi-jampera__djemperi'],
  ['rubashki','Рубашки','Рубашки, блузы и джемперы','catalog__rubashki-bluzi-jampera__rubashki'],
  ['bryuki','Брюки','Брюки, шорты и юбки','catalog__bruki-shorti-ubki__bruki'],
  ['shorty','Шорты','Брюки, шорты и юбки','catalog__bruki-shorti-ubki__shorti'],
  ['yubki','Юбки','Брюки, шорты и юбки','catalog__bruki-shorti-ubki__ubki'],
  ['zhilety','Жилеты','Жилеты и жакеты','catalog__jileti-jaketi__jileti'],
  ['zhakety','Жакеты','Жилеты и жакеты','catalog__jileti-jaketi__jaketi'],
  ['topy','Топы','Топы и бра','catalog__topi-bra__topi'],
  ['bra','Бра','Топы и бра','catalog__topi-bra__bra'],
  ['kurtki','Куртки','Верхняя одежда','catalog__verhnjaja-odezhda__kurtki'],
  ['palto','Пальто','Верхняя одежда','catalog__verhnjaja-odezhda__palto'],
  ['vyshivki','Вышивки','Аксессуары','catalog__aksessuari__vishivki'],
  ['aksessuary','Аксессуары','Аксессуары','catalog__aksessuari__aksessuari'],
  ['besplatnye','Бесплатные выкройки','Бесплатные выкройки','catalog__besplatnie-vikroyki'],
];
const levelOf = t => /эксперт/i.test(t)?'expert':/специалист/i.test(t)?'specialist':/новичок/i.test(t)?'novice':null;
const listingLevel = slug => { for (const [k,v] of Object.entries(listing)) if (v.slugs?.includes(slug)) { if (/__(expert|ekspert)$/.test(k)) return 'expert'; if (/__(specialist|spetsialist)$/.test(k)) return 'specialist'; if (/__(novichok|novihok)$/.test(k)) return 'novice'; } return null; };
const shortDesc = slug => { for (const v of Object.values(listing)) if (v.descs?.[slug]) return v.descs[slug]; return ''; };
fs.mkdirSync(path.join(APP,'img/p'),{recursive:true}); fs.mkdirSync(path.join(APP,'img/t'),{recursive:true});
const out = []; const sources = {};
// order: as on site (by category listing order)
const order = []; for (const t of TYPES) for (const s of listing[t[3]]?.slugs||[]) if (!order.includes(s)) order.push(s);
for (const s of Object.keys(prods)) if (!order.includes(s)) order.push(s);
for (const slug of order) {
  const p = prods[slug]; const id = slug.replace(/[^a-z0-9-]/gi,'-');
  const imgs = [];
  for (const [i, a] of (plan[slug]||[]).entries()) {
    const src = a.local ? path.join(LOCAL, a.local) : (a.fallback ? path.join(S,'siteimg',a.fallback) : null);
    if (!src) continue;
    const name = `${id}-${i+1}.webp`;
    const img = sharp(src, {failOn:'none'}).rotate().flatten({background:'#ffffff'});
    const meta = await sharp(src).metadata();
    const full = path.join(APP,'img/p',name);
    if (!fs.existsSync(full)) await img.clone().resize(1200,1500,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(full);
    const info = await sharp(full).metadata();
    if (i===0 || !fs.existsSync(path.join(APP,'img/t',name))) await sharp(full).resize(480,600,{fit:'inside',withoutEnlargement:true}).webp({quality:78}).toFile(path.join(APP,'img/t',name));
    imgs.push({ f: name, w: info.width, h: info.height });
    sources[name] = a.local ? 'local: '+a.local : 'site: '+a.site;
  }
  const types = TYPES.filter(t => (listing[t[3]]?.slugs||[]).includes(slug)).map(t=>t[0]);
  const level = levelOf(p.levelTxt) || listingLevel(slug);
  const opts = p.selects.map(s => ({ label: s.label, values: [...new Set(s.values)] }));
  out.push({ id, url: `/product/${slug}/`, name: p.name.replace(/"([^"]+)"/g,'«$1»'), sku: p.sku, price: p.price, old: p.old, status: p.status,
    level, types, short: shortDesc(slug), opts, variants: p.variants, imgs, desc: p.desc });
}
const typesOut = TYPES.map(([id,title,group,key]) => ({ id, title, group, url: '/' + key.replace(/__/g,'/') + '/' }));
fs.writeFileSync(path.join(APP,'js/catalog.js'), '// Сгенерировано из данных сайта sl-ls.ru\nwindow.SL_TYPES = ' + JSON.stringify(typesOut, null, 1) + ';\nwindow.SL_PRODUCTS = ' + JSON.stringify(out, null, 1) + ';\n');
fs.writeFileSync(path.join(S,'img-sources.json'), JSON.stringify(sources,null,1));
console.log('products', out.length, 'images', Object.keys(sources).length, 'local', Object.values(sources).filter(v=>v.startsWith('local')).length);
for (const p of out) console.log(p.id.padEnd(28), (p.level||'-').padEnd(10), p.types.join(','));
