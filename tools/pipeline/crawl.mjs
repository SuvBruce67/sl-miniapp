import fs from 'fs'; import path from 'path';
const OUT = process.argv[2]; fs.mkdirSync(OUT,{recursive:true});
const base='https://www.sl-ls.ru';
const seen=new Set(); const q=['/'];
const dec=new TextDecoder('windows-1251');
const ok=p=>/^\/(catalog|content|product)\//.test(p)&&!/compare|favorites|\?|#|\.(pdf|jpg|png)/i.test(p) || p==='/';
let n=0;
while(q.length){
  const p=q.shift(); if(seen.has(p)) continue; seen.add(p);
  try{
    const r=await fetch(base+p,{headers:{'User-Agent':'Mozilla/5.0'}});
    const buf=Buffer.from(await r.arrayBuffer()); const html=dec.decode(buf);
    const fn=(p.replace(/^\/|\/$/g,'').replace(/\//g,'__')||'index')+'.html';
    fs.writeFileSync(path.join(OUT,fn),html); n++;
    for(const m of html.matchAll(/href="(\/[^"]*)"/g)){ let h=m[1].split('#')[0]; if(ok(h)&&!seen.has(h)) q.push(h); }
  }catch(e){console.error('ERR',p,e.message)}
}
console.log('pages',n);
fs.writeFileSync(path.join(OUT,'_urls.txt'),[...seen].join('\n'));
