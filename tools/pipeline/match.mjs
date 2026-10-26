import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const [S,LOCAL]=process.argv.slice(2);
async function feat(f){
  const img=sharp(f,{failOn:'none'}).rotate().flatten({background:'#ffffff'});
  const meta=await sharp(f,{failOn:'none'}).metadata();
  const g=await img.clone().grayscale().resize(17,16,{fit:'fill'}).raw().toBuffer();
  let bits=[]; for(let y=0;y<16;y++)for(let x=0;x<16;x++) bits.push(g[y*17+x]>g[y*17+x+1]?1:0);
  const c=await img.clone().resize(8,8,{fit:'fill'}).removeAlpha().raw().toBuffer();
  let w=meta.width,h=meta.height; if((meta.orientation||1)>=5) [w,h]=[h,w];
  return {bits,c:[...c],ar:w/h,w,h};
}
const ham=(a,b)=>{let d=0;for(let i=0;i<a.length;i++) d+=a[i]!==b[i];return d};
const cd=(a,b)=>{let d=0;for(let i=0;i<a.length;i++) d+=Math.abs(a[i]-b[i]);return d/a.length};
const site=JSON.parse(fs.readFileSync(path.join(S,'siteimg.json'),'utf8'));
const sf={}; for(const fn of Object.keys(site)){ try{sf[fn]=await feat(path.join(S,'siteimg',fn))}catch(e){console.error('site',fn,e.message)} }
const lf={}; for(const fn of fs.readdirSync(LOCAL).filter(f=>/\.(jpe?g|png)$/i.test(f))){ try{lf[fn]=await feat(path.join(LOCAL,fn))}catch(e){console.error('local',fn,e.message)} }
const res=[];
for(const [l,a] of Object.entries(lf)){
  let best=[]; for(const [s,b] of Object.entries(sf)){ best.push({s,d:ham(a.bits,b.bits),c:cd(a.c,b.c),ar:Math.abs(Math.log(a.ar/b.ar))}); }
  best.sort((x,y)=>(x.d+x.c/2+x.ar*60)-(y.d+y.c/2+y.ar*60));
  res.push({local:l,w:a.w,h:a.h,top:best.slice(0,3).map(b=>({url:site[b.s],d:b.d,c:+b.c.toFixed(1),ar:+b.ar.toFixed(2)}))});
}
fs.writeFileSync(path.join(S,'match.json'),JSON.stringify(res,null,1));
for(const r of res) console.log(r.local.padEnd(48),r.w+'x'+r.h,'→',r.top.map(t=>`${t.url} d${t.d} c${t.c} ar${t.ar}`).slice(0,2).join(' || '));
