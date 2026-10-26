import fs from 'fs'; import path from 'path';
const S=process.argv[2]; const out=path.join(S,'siteimg'); fs.mkdirSync(out,{recursive:true});
const prods=JSON.parse(fs.readFileSync(path.join(S,'products.json'),'utf8'));
const urls=new Set();
for(const p of Object.values(prods)) for(const u of p.imgs) urls.add(u.replace('/original/','/big/'));
for(const f of fs.readdirSync(path.join(S,'pages'))){ const h=fs.readFileSync(path.join(S,'pages',f),'utf8');
  for(const m of h.matchAll(/(?:src|data-src|data-lazy)="(\/(?:pictures\/banners|UserFiles\/Image)\/[^"]+\.(?:jpe?g|png|gif|webp))"/gi)) urls.add(m[1]); }
const list=[...urls]; const map={};
const prev=fs.existsSync(path.join(S,"siteimg.json"))?JSON.parse(fs.readFileSync(path.join(S,"siteimg.json"),"utf8")):{}; Object.assign(map,prev); const have=new Set(Object.values(prev));
for(const [i,u] of list.entries()){ if(have.has(u)) continue; await (async()=>{ const fn=String(i).padStart(3,'0')+'_'+path.basename(u).replace(/[^\w.-]/g,'_');
  try{ const r=await fetch('https://www.sl-ls.ru'+encodeURI(u)); if(!r.ok) throw new Error(r.status); fs.writeFileSync(path.join(out,fn),Buffer.from(await r.arrayBuffer())); map[fn]=u;}catch(e){console.error('ERR',u,e.message)} })(); }
fs.writeFileSync(path.join(S,'siteimg.json'),JSON.stringify(map,null,1)); console.log(Object.keys(map).length,'of',list.length);
