import {readImage} from '../../../../lib/content-store';
export const runtime='nodejs';
export async function GET(request,{params}) {
 const {id}=await params;
 if(!/^[a-f0-9-]{36}\.(png|jpeg|webp)$/.test(id))return new Response(null,{status:404});
 if((!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY))return new Response(null,{status:503});
 try{
  const result=await readImage(id);
  if(!result)return new Response(null,{status:404});
  const type=id.endsWith('.png')?'image/png':id.endsWith('.webp')?'image/webp':'image/jpeg';
  return new Response(result.stream,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:502})}
}
