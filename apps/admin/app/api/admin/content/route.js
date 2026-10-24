import service from '../../../../lib/content-service.cjs';
import {readContent,writeContent} from '../../../../lib/content-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(v,status=200,headers={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function GET(request) {
 if(!service.authenticated(request))return json({error:'تسجيل دخول الإدارة مطلوب.'},401);
 try{const content=await readContent();return json(service.validateContent(content||service.defaultContent),200,{'X-Spark-Content-Initialized':content?'true':'false'})}catch{return json({error:'تعذّر قراءة المحتوى من Supabase. تحقق من ملف SQL والإعدادات.'},502)}
}
export async function PUT(request) {
 if(!service.authenticated(request)||!service.sameOrigin(request))return json({error:'تسجيل دخول الإدارة مطلوب.'},401);
 if(Number(request.headers.get('content-length'))>3000000)return json({error:'حجم المحتوى كبير جدًا.'},413);
 let value;try{const raw=await request.text();if(Buffer.byteLength(raw)>3000000)return json({error:'حجم المحتوى كبير جدًا.'},413);value=service.validateContent(JSON.parse(raw));}catch{return json({error:'راجع بيانات المحتوى.'},400)}
 try{await writeContent(value);return json({saved:true})}catch{return json({error:'تعذّر النشر. تحقق من إعداد Supabase وتشغيل ملف SQL.'},502)}
}
