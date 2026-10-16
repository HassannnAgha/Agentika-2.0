import sharp from 'sharp';
const SRC=process.argv[2];
const [L,T,W,H]=process.argv.slice(3,7).map(Number);
const C=Number(process.argv[7]||72), R=Number(process.argv[8]||52);
const {data}=await sharp(SRC).extract({left:L,top:T,width:W,height:H}).resize(C,R,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
const ramp=' .:-=+*#%@';
console.log(`crop ${L},${T} ${W}x${H}  aspect ${(W/H).toFixed(2)}`);
for(let j=0;j<R;j++){let s='';
 for(let i=0;i<C;i++){const o=(j*C+i)*3;const l=(data[o]*0.299+data[o+1]*0.587+data[o+2]*0.114)/255;
  s+=ramp[Math.min(9,Math.floor(l*10))];}
 console.log(s);}
