export async function prepareImage(file) {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw new Error('اختر صورة PNG أو JPEG أو WebP حتى 10 ميغابايت.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('تعذّر قراءة الصورة.'))});
  const scale=Math.min(1,1600/image.naturalWidth,1600/image.naturalHeight);
  const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('تعذّر تجهيز الصورة.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.82,.65,.5]){
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
   if(blob&&blob.size<=500000)return blob;
  }
  throw new Error('الصورة كبيرة جدًا بعد تجهيزها. اختر صورة أصغر.');
 }finally{URL.revokeObjectURL(url)}
}
export function imageData(blob) {return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('تعذّر قراءة الصورة.'));reader.readAsDataURL(blob)});}
