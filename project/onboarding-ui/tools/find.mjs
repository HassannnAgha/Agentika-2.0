import sharp from 'sharp';
const SRC=process.argv[2];
const {data,info}=await sharp(SRC).removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
let eye={x0:1e9,y0:1e9,x1:-1,y1:-1,n:0};
let pale={x0:1e9,y0:1e9,x1:-1,y1:-1,n:0};
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const o=(y*W+x)*3,r=data[o],g=data[o+1],b=data[o+2];
  // saturated orange: strong red, mid green, weak blue
  if(r>170&&g>60&&g<150&&b<80&&y>300&&y<800&&x>250&&x<700){
    eye.n++;eye.x0=Math.min(eye.x0,x);eye.y0=Math.min(eye.y0,y);eye.x1=Math.max(eye.x1,x);eye.y1=Math.max(eye.y1,y);
  }
  // near-white smoke/cigarette in the upper right of the cat
  if(r>205&&g>205&&b>190&&y>330&&y<650&&x>430&&x<720){
    pale.n++;pale.x0=Math.min(pale.x0,x);pale.y0=Math.min(pale.y0,y);pale.x1=Math.max(pale.x1,x);pale.y1=Math.max(pale.y1,y);
  }
}
console.log('orange eyes bbox:',eye);
console.log('pale smoke/cig bbox:',pale);
