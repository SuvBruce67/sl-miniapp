import fs from 'fs'; import path from 'path';
const [S, LOCAL, DRY] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(path.join(S,'plan.json'),'utf8'));
const prods = JSON.parse(fs.readFileSync(path.join(S,'products.json'),'utf8'));
const match = JSON.parse(fs.readFileSync(path.join(S,'match.json'),'utf8'));
const nice = n => n.replace(/"([^"]+)"/g,'«$1»').replace(/[\/:*?"<>|]/g,'');
const renames = new Map(); // old -> new
const urlOwner = {}; // site big url -> [slug, index]
for (const [slug, arr] of Object.entries(plan)) arr.forEach((a,i)=>{ urlOwner[a.site.replace('/original/','/big/')] = [slug,i]; if (a.local && !renames.has(a.local)) renames.set(a.local, `${nice(prods[slug].name)} - ${i+1}${path.extname(a.local).toLowerCase()}`); });
for (const m of match) { if (renames.has(m.local)) continue; const t=m.top[0]; if (t.d<=30 && urlOwner[t.url]) { const [slug,i]=urlOwner[t.url]; renames.set(m.local, `${nice(prods[slug].name)} - ${i+1} (копия)${path.extname(m.local).toLowerCase()}`); } }

// уникальность
const used = new Set(fs.readdirSync(LOCAL).map(f=>f.toLowerCase()));
const log = ['Старое имя;Новое имя'];
for (const [o, n0] of renames) {
  if (!fs.existsSync(path.join(LOCAL,o))) continue;
  let n = n0, k = 2; while (used.has(n.toLowerCase()) && n.toLowerCase() !== o.toLowerCase()) { n = n0.replace(/(\.\w+)$/, ` (${k++})$1`); }
  used.add(n.toLowerCase());
  log.push(`${o};${n}`);
  if (!DRY) fs.renameSync(path.join(LOCAL,o), path.join(LOCAL,n));
  for (const arr of Object.values(plan)) for (const a of arr) if (a.local === o) a.local = n;
}
if (!DRY) { fs.writeFileSync(path.join(LOCAL,'_переименования.csv'), '\ufeff'+log.join('\r\n')); fs.writeFileSync(path.join(S,'plan.json'), JSON.stringify(plan,null,1)); }
console.log(log.length-1, 'files'); console.log(log.slice(1).join('\n'));
