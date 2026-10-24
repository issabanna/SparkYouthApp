import {randomUUID} from 'node:crypto';
import service from '../../../lib/content-service.cjs';
import {writeImage} from '../../../lib/content-store';
export const runtime='nodejs';
export async function POST(request) {
 if(!service.authenticated(request)||!service.sameOrigin(request))return Response.json({error:'تسجيل دخول الإدارة مطلوب.'},{status:401});
 if(Number(request.headers.get('content-length'))>4000000)return Response.json({error:'الصورة كبيرة جدًا.'},{status:413});
 const bytes=Buffer.from(await request.arrayBuffer());
 if(!bytes.length||bytes.length>4000000)return Response.json({error:'الصورة كبيرة جدًا.'},{status:413});
 const type=service.imageType(bytes);
 if(!type)return Response.json({error:'اختر صورة PNG أو JPEG أو WebP.'},{status:400});
 const id=randomUUID()+'.'+type;
 try{await writeImage(id,bytes,'image/'+type);return Response.json({image:'/api/media/'+id},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'تعذّر رفع الصورة. تحقق من إعداد Supabase وتشغيل ملف SQL.'},{status:502})}
}
