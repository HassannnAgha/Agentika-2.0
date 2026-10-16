import sharp from 'sharp';
const SRC=process.argv[2];
const {data,info}=await sharp(SRC).removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W}=info;
// scan only the head band, and demand a strongly saturated orange
const rows={};
let bb={x0:1e9,y0:1e9,x1:-1,y1:-1,n:0};
for(let y=480;y<600;y++)for(let x=330;x<560;x++){
  const o=(y*W+x)*3,r=data[o],g=data[o+1],b=data[o+2];
  if(r>180&&b<70&&(r-g)>70&&(g-b)>10){
    bb.n++;bb.x0=Math.min(bb.x0,x);bb.y0=Math.min(bb.y0,y);bb.x1=Math.max(bb.x1,x);bb.y1=Math.max(bb.y1,y);
    rows[y]=(rows[y]||0)+1;
  }
}
console.log('eye pixels bbox:',bb);
const ys=Object.keys(rows).map(Number).sort((a,b)=>a-b);
console.log('row span:',ys[0],'to',ys[ys.length-1]);
