import sharp from 'sharp'; import path from 'path';
const [out, ...files]=process.argv.slice(2); const W=220,H=240;
const tiles=await Promise.all(files.map(async (f,i)=>({input:await sharp(f).rotate().flatten({background:'#ddd'}).resize(W-10,H-30,{fit:'contain',background:'#ddd'}).toBuffer(), left:(i%5)*W+5, top:Math.floor(i/5)*H+5})));
const labels=files.map((f,i)=>`<text x="${(i%5)*W+8}" y="${Math.floor(i/5)*H+H-8}" font-size="12" font-family="Arial">${path.basename(f).slice(0,32).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>`).join('');
const rows=Math.ceil(files.length/5);
await sharp({create:{width:W*5,height:H*rows,channels:3,background:'#fff'}}).composite([...tiles,{input:Buffer.from(`<svg width="${W*5}" height="${H*rows}">${labels}</svg>`),left:0,top:0}]).jpeg({quality:80}).toFile(out);
