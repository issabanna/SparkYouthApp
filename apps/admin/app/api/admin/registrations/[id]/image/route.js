import service from '../../../../../../lib/content-service.cjs';
import {getRegistration} from '../../../../../../lib/registration-store';
import {reply} from '../../../../../../lib/registration-service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 if(!service.authenticated(request))return reply({error:'تسجيل دخول الإدارة مطلوب.'},401);
 try{
  const {id}=await params,row=await getRegistration(id);
  const image=new URL(request.url).searchParams.get('kind')==='receipt'?row?.record.receipt:row?.record.details?.idDocument;
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(image?.uri||'');
  if(!match)return reply({error:'الصورة غير موجودة.'},404);
  return new Response(Buffer.from(match[2],'base64'),{headers:{'Content-Type':'image/'+match[1],'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return reply({error:'الصورة غير متاحة.'},503);}
}
