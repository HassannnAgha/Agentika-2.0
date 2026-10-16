import sharp from 'sharp';
const SRC=process.argv[2];
const m=await sharp(SRC).metadata();
console.log('size:',m.width,'x',m.height);
const C=64,R=46;
const {data}=await sharp(SRC).resize(C,R,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
const ramp=' .:-=+*#%@';
for(let j=0;j<R;j++){let s='';
 for(let i=0;i<C;i++){const o=(j*C+i)*3;const l=(data[o]*0.299+data[o+1]*0.587+data[o+2]*0.114)/255;
  s+=ramp[Math.min(9,Math.floor(l*10))];}
 console.log(s);}
