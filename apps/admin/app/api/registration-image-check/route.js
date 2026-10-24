import service from '../../../lib/content-service.cjs';
import checker from '../../../lib/registration-image-check.cjs';
import {readContent} from '../../../lib/content-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const requests=new Map();
let total=0,resetAt=0;
function allow(request){
 const now=Date.now();
 if(now>resetAt){requests.clear();total=0;resetAt=now+3600000;}
 const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown';
 const count=requests.get(ip)||0;
 if(count>=5||total>=100)return false;
 requests.set(ip,count+1);total++;return true;
}
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
  if(!allow(request))return reply({status:'unavailable',message:'وصلت للحد المؤقت لفحص الصور. حاول لاحقًا.'},429);
  return reply(await checker.checkImage(value.image,{apiKey:process.env.OPENAI_API_KEY}));
 }catch{return reply({status:'unavailable',message:'تعذّر فحص الصورة الآن. حاول مجددًا.'},502);}
}
