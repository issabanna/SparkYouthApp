export async function prepareImage(file) {
 const types=['image/jpeg','image/png','image/webp','image/avif','image/gif','image/bmp','image/heic','image/heif'];
 const inferred=/\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(file.name||'');
 if((!types.includes(file.type)&&!(file.type===''&&inferred))||file.size>20000000)throw new Error('اختر صورة حتى 20 ميغابايت. يُفضّل JPEG أو PNG أو WebP.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{image.src='';reject(new Error('تعذّر فتح الصورة. جرّب حفظها بصيغة JPEG ثم رفعها.'));},20000);
   image.onload=()=>{clearTimeout(timer);resolve()};
   image.onerror=()=>{clearTimeout(timer);reject(new Error('تعذّر قراءة الصورة. إذا كانت HEIC أو HEIF، حوّلها إلى JPEG ثم أعد المحاولة.'))};
   image.src=url;
  });
  let scale=Math.min(1,1600/image.naturalWidth,1600/image.naturalHeight);
  for(let attempt=0;attempt<3;attempt++){
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('تعذّر تجهيز الصورة.');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.65,.5]){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    if(blob&&blob.size<=500000)return blob;
   }
   scale*=.7;
  }
  throw new Error('تعذّر ضغط الصورة. اختر صورة أصغر.');
 }finally{URL.revokeObjectURL(url)}
}
export function imageData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('تعذّر قراءة الصورة.'));reader.readAsDataURL(blob)});}
