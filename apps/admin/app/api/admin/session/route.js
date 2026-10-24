import service from '../../../../lib/content-service.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(v,status=200,headers={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function GET(request) {return json({storage:!!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,configured:service.configured(),authenticated:service.authenticated(request)});}
export async function POST(request) {
  if(!service.configured())return json({error:'اربط Supabase وأضف ADMIN_PASSWORD من 16 حرفًا على الأقل.'},503);
  if(!service.sameOrigin(request)||!request.headers.get('content-type')?.includes('application/json'))return json({error:'طلب غير مسموح.'},403);
  let value;try{value=await request.json()}catch{return json({error:'طلب غير صالح.'},400)}
  if(!service.validPassword(value.password))return json({error:'تعذّر تسجيل الدخول.'},401);
  return json({authenticated:true},200,{'Set-Cookie':service.cookie(process.env.ADMIN_PASSWORD,new URL(request.url).protocol==='https:')});
}
export async function DELETE(request) {
  if(!service.sameOrigin(request))return json({error:'طلب غير مسموح.'},403);
  return json({authenticated:false},200,{'Set-Cookie':'spark_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});
}
