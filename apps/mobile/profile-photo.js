import {Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
async function webPhoto(file){
 if(file.size>20000000||(!/^image\//.test(file.type)&&!(/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name))))throw Error('اختر صورة حتى 20 ميغابايت.');
 const url=URL.createObjectURL(file);
 try{
  const image=new window.Image();
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('تعذّر فتح الصورة. جرّب JPEG أو PNG.')),20000);image.onload=()=>{clearTimeout(timer);resolve()};image.onerror=()=>{clearTimeout(timer);reject(Error('تعذّر فتح الصورة. جرّب JPEG أو PNG.'))};image.src=url});
  const scale=Math.min(1,1000/image.naturalWidth,1000/image.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('تعذّر تجهيز الصورة.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.65,.45]){const uri=canvas.toDataURL('image/jpeg',quality);if(uri.length<665000)return uri;}
  throw Error('تعذّر ضغط الصورة. اختر صورة أصغر.');
 }finally{URL.revokeObjectURL(url)}
}
export function pickProfilePhoto(){
 if(Platform.OS==='web')return new Promise((resolve,reject)=>{
  const input=document.createElement('input');input.type='file';input.accept='image/*';input.style.display='none';document.body.appendChild(input);
  input.oncancel=()=>{input.remove();resolve(null)};
  input.onchange=()=>{const file=input.files?.[0];input.remove();if(!file){resolve(null);return;}webPhoto(file).then(resolve,reject)};
  input.click();
 });
 return (async()=>{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted)throw Error('اسمح بالوصول للصور لاختيار الصورة.');const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],base64:true,quality:.35,allowsEditing:true,aspect:[1,1]});if(result.canceled)return null;const asset=result.assets[0],uri='data:'+(asset.mimeType||'image/jpeg')+';base64,'+asset.base64;if(!asset.base64||uri.length>665000)throw Error('اختر صورة أصغر من 500 كيلوبايت.');return uri})();
}
