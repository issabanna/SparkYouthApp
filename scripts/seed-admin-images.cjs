const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {createClient} = require('@supabase/supabase-js');
const {defaultContent} = require('../packages/shared');
const bucket = 'spark-content-media';
const sources = ['camp.png','trail.png','team.png','spark-logo.png'];
function imageId(name, bytes) {
  const digest=crypto.createHash('sha256').update(name).update(bytes).digest();
  digest[6]=(digest[6]&15)|80;digest[8]=(digest[8]&63)|128;
  const hex=digest.subarray(0,16).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}.png`;
}
function migrateImageReferences(content, replacements) {
  // Change only the known starter-image paths. Preserve custom uploads and all
  // text/settings, including an intentionally removed welcome image.
  const next=structuredClone(content);
  next.branding={logo:'/media/spark-logo.png',welcomeImage:'/media/camp.png',...next.branding};
  const replace=value=>replacements[value]||value;
  for(const section of ['announcements','activities','journeys'])
    for(const item of next[section]||[])item.image=replace(item.image);
  for(const item of next.galleries||[])item.images=(item.images||[]).map(replace);
  next.branding.logo=replace(next.branding.logo);
  next.branding.welcomeImage=replace(next.branding.welcomeImage);
  return next;
}
async function seed(client, loadFile) {
  const {data:bucketInfo,error:bucketError}=await client.storage.getBucket(bucket);
  if(bucketError||bucketInfo?.public!==false)throw new Error('Supabase image bucket must be private. Run supabase/001_content_and_images.sql.');
  const replacements={};
  for(const name of sources){
    const bytes=loadFile(name),id=imageId(name,bytes);
    const {error}=await client.storage.from(bucket).upload(id,bytes,{upsert:false,contentType:'image/png',cacheControl:'31536000'});
    if(error&&String(error.statusCode)!=='409')throw new Error('Could not import starter image '+name+'. Check Supabase Storage configuration.');
    replacements['/media/'+name]='/api/media/'+id;
    replacements['https://sparkyouth.vercel.app/media/'+name]='/api/media/'+id;
  }
  for(let attempt=0;attempt<3;attempt++){
    const {data:row,error}=await client.from('spark_content').select('content,updated_at').eq('id','main').maybeSingle();
    if(error)throw new Error('Supabase content table is unavailable. Run the SQL setup.');
    const previous=row?.content||defaultContent,next=migrateImageReferences(previous,replacements);
    if(row&&isDeepStrictEqual(previous,next)){console.log('Starter images already connected to admin content.');return;}
    const values={content:next,updated_at:new Date().toISOString()};
    if(!row){
      const result=await client.from('spark_content').insert({id:'main',...values});
      if(!result.error){console.log('Imported 4 starter images into admin-managed Supabase content.');return;}
      if(result.error.code==='23505')continue;
    }else{
      const result=await client.from('spark_content').update(values).eq('id','main').eq('updated_at',row.updated_at).select('id');
      if(!result.error&&result.data?.length){console.log('Connected starter images to admin content; existing edits preserved.');return;}
      if(!result.error)continue;
    }
    throw new Error('Could not save starter-image references in Supabase.');
  }
  throw new Error('Admin content changed during image import. Retry the build; no concurrent edits were overwritten.');
}
async function main(){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY){console.log('Starter-image import skipped: Supabase is not configured in this environment.');return;}
 const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 await seed(client,name=>fs.readFileSync(path.join(__dirname,'../apps/admin/public/media',name)));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={seed,migrateImageReferences,imageId};
