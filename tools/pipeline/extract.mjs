import fs from 'fs'; import path from 'path';
const P=process.argv[2]; const OUT=process.argv[3];
const rd=f=>fs.readFileSync(path.join(P,f),'utf8');
const ent=s=>s.replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&laquo;/g,'«').replace(/&raquo;/g,'»').replace(/&mdash;/g,'—').replace(/&ndash;/g,'–').replace(/&amp;/g,'&').replace(/&#039;/g,"'");
const strip=s=>ent(s.replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
// listings: which product slugs appear on each catalog page
const listing={};
for(const f of fs.readdirSync(P).filter(f=>f.startsWith('catalog__'))){
  const h=rd(f); const i=h.indexOf('class="products-grid"'); if(i<0){listing[f]=[];continue}
  const body=h.slice(i, h.indexOf('<footer',i));
  const items=[...body.matchAll(/class="product__title-link">([^<]*)<\/a>[\s\S]*?(?=class="product__item |$)/g)];
  const slugs=[...new Set([...body.matchAll(/href="\/product\/([^/]+)\/" title=/g)].map(m=>m[1]))];
  const descs={}; for(const m of body.matchAll(/href="\/product\/([^/]+)\/" title=[\s\S]*?<div class="product__description">([\s\S]*?)<\/div>/g)) descs[m[1]]=strip(m[2]);
  listing[f.replace('.html','')]={slugs,descs, title: strip((h.match(/<div class="page-title"><h1>([\s\S]*?)<\/h1>/)||[])[1]||'')};
}
// products
const products={};
for(const f of fs.readdirSync(P).filter(f=>f.startsWith('product__'))){
  const h=rd(f); const slug=f.replace('product__','').replace('.html','');
  const name=strip((h.match(/<div class="page-title"><h1>([\s\S]*?)<\/h1>/)||[])[1]||'');
  const imgs=[...new Set([...h.matchAll(/data-src="(\/pictures\/tovar\/original\/[^"]+)" class="product__image-link" data-fancybox="products-full"/g)].map(m=>m[1]))];
  const sku=(h.match(/itemprop="sku" content="([^"]*)"/)||[])[1]||'';
  const price=parseFloat((h.match(/itemprop="price" content="([^"]*)"/)||[])[1]||'0');
  const pid=(h.match(/id="tovar_form_price(\d+)"/)||[])[1];
  const old=parseFloat((h.match(new RegExp('id="tovar_form_price_old'+pid+'">([^<]*)<'))||[])[1]||'0');
  const status=strip((h.match(/class="product__status status [^"]*tovar_form_nalichie_status_\d+">([\s\S]*?)<\/div>/)||[])[1]||'');
  // variants
  const selects=[...h.matchAll(/<select class="select" id="tovar_form_variants\d+"[^>]*>([\s\S]*?)<\/select>/g)].map(m=>{
    const opts=[...m[1].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
    return {label:strip(opts[0]?.[2]||''), values:opts.slice(1).map(o=>({label:strip(o[2]),value:o[1]}))};
  });
  const hash=[...h.matchAll(/option_variant_hash\['([^']+)'\]\['([^']+)'\] = '([^']+)'/g)].map(m=>({a:m[1],b:m[2],v:m[3]}));
  const variants = hash.length? hash.map(x=>{const p=x.v.split('::'); return {opt1:x.a,opt2:x.b,id:p[0],price:+p[1],sku:p[5]}})
     : (selects[0]?.values||[]).map(o=>{const p=o.value.split('::'); return {opt1:o.label,id:p[0],price:+p[1],sku:p[5]}});
  // description
  let d=(h.match(/id="tab_description"[^>]*>([\s\S]*?)<\/div>\s*<div id="tab_response"/)||[])[1]||'';
  d=d.replace(/<!--[\s\S]*?-->/g,'').replace(/<(\/?)(\w+)[^>]*?(href="[^"]*")?[^>]*>/g,(m,c,t,hr)=>{t=t.toLowerCase(); if(!['p','ul','ol','li','strong','b','br','a','em','i'].includes(t)) return ''; if(t==='b')t='strong'; if(t==='a'&&!c) return '<a '+(hr||'')+' target="_blank">'; return '<'+c+t+'>'}).replace(/&nbsp;/g,' ').replace(/\s+/g,' ').replace(/<p>\s*<\/p>/g,'').trim();
  const levelTxt=(strip(d).match(/Уровень сложности\s*:?\s*([^\n.]*?\(\d из 3\))/i)||[])[1]||'';
  const tabs={}; for(const id of ['85','57','165']){ const m=h.match(new RegExp('id="tab_'+id+'"[^>]*>([\s\S]*?)</div>')); if(m) tabs[id]=strip(m[1]).slice(0,300)}
  products[slug]={slug,name,sku,price,old,status,selects:selects.map(s=>({label:s.label,values:s.values.map(v=>v.label)})),variants,imgs,levelTxt,desc:d};
}
fs.writeFileSync(path.join(OUT,'listing.json'),JSON.stringify(listing,null,1));
fs.writeFileSync(path.join(OUT,'products.json'),JSON.stringify(products,null,1));
console.log(Object.keys(products).length,'products');
for(const p of Object.values(products)) console.log(p.slug,'|',p.name,'|',p.price,p.old,'|',p.status,'|',p.levelTxt,'|',p.selects.map(s=>s.label+':'+s.values.join(',')).join(' / '),'|',p.variants.length,'v |',p.imgs.length,'img');
