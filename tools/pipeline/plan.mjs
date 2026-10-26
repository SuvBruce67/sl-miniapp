import fs from 'fs'; import path from 'path';
const S=process.argv[2];
const match=JSON.parse(fs.readFileSync(path.join(S,'match.json'),'utf8'));
const prods=JSON.parse(fs.readFileSync(path.join(S,'products.json'),'utf8'));
const site=JSON.parse(fs.readFileSync(path.join(S,'siteimg.json'),'utf8'));
const siteByUrl=Object.fromEntries(Object.entries(site).map(([f,u])=>[u,f]));
const cand={}; // site url -> [{local,d,px}]
for(const m of match){ for(const t of m.top){ if(t.d<=30 && t.ar<0.05){ (cand[t.url]??=[]).push({local:m.local,d:t.d,px:m.w*m.h}); } } }
const plan={};
for(const p of Object.values(prods)){
  plan[p.slug]=p.imgs.map(o=>{ const big=o.replace('/original/','/big/'); const c=(cand[big]||[]).sort((a,b)=>(a.d-b.d)||(b.px-a.px));
    return {site:o, local:c[0]?.local||null, d:c[0]?.d, fallback:siteByUrl[big]||null}; });
}
fs.writeFileSync(path.join(S,'plan.json'),JSON.stringify(plan,null,1));
let miss=0,tot=0; for(const [s,arr] of Object.entries(plan)){ console.log(s.padEnd(30), arr.map(a=>a.local?`[${a.local}]`:`(site:${path.basename(a.site)})`).join(' ')); for(const a of arr){tot++; if(!a.local) miss++;} }
console.log('missing local',miss,'of',tot);
const used=new Set(Object.values(plan).flat().map(a=>a.local)); console.log('local matched but unused:', match.filter(m=>m.top[0].d<=30&&!used.has(m.local)).map(m=>m.local+'→'+m.top[0].url).join('\n'));
