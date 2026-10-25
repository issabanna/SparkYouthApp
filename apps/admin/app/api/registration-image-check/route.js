import service from '../../../lib/content-service.cjs';
import checker from '../../../lib/registration-image-check.cjs';
import {readContent} from '../../../lib/content-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 if(!service.sameOrigin(request))return reply({status:'unavailable'},403);
 if(!process.env.OPENAI_API_KEY||!service.configured())return reply({status:'unavailable',message:'فحص الصور غير مفعّل حاليًا.'},503);
 if(Number(request.headers.get('content-length'))>710000)return reply({status:'unavailable'},413);
 let value;
 try{const body=await request.text();if(body.length>710000)return reply({status:'unavailable'},413);value=JSON.parse(body);checker.parseImage(value.image);}catch{return reply({status:'unavailable',message:'اختر صورة PNG أو JPEG أو WebP أقل من 500 كيلوبايت.'},400);}
 try{
  const content=service.publicContent(await readContent()||service.defaultContent);
  const activity=content.activities.find(a=>a.id===value.activityId&&a.kind==='camp'&&!a.inactive&&a.registrationOpen);
  if(!activity)return reply({status:'unavailable'},404);
  if(!checker.allowImageCheck(request))return reply({status:'unavailable',message:'وصلت للحد المؤقت لفحص الصور. حاول لاحقًا.'},429);
  return reply(await checker.checkImage(value.image,{apiKey:process.env.OPENAI_API_KEY}));
 }catch{return reply({status:'unavailable',message:'تعذّر فحص الصورة الآن. حاول مجددًا.'},502);}
}
