import {createClient} from '@supabase/supabase-js';
function client() {
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
}
const bucket='spark-content-media';
export async function readContent() {
  const {data,error}=await client().from('spark_content').select('content').eq('id','main').maybeSingle();
  if(error)throw error;
  return data?.content||null;
}
export async function writeContent(content) {
  const {error}=await client().from('spark_content').upsert({id:'main',content,updated_at:new Date().toISOString()},{onConflict:'id'});
  if(error)throw error;
}
export async function writeImage(id,bytes,type) {
  const {error}=await client().storage.from(bucket).upload(id,bytes,{contentType:type,cacheControl:'31536000',upsert:false});
  if(error)throw error;
}
export async function readImage(id) {
  const {data,error}=await client().storage.from(bucket).download(id);
  if(error){if(String(error.statusCode)==='404'||String(error.statusCode)==='400'&&error.message==='Object not found')return null;throw error;}
  return data ? {stream:data.stream()} : null;
}
