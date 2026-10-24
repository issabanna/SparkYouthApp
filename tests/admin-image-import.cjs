const assert=require('node:assert/strict');
const {seed,migrateImageReferences,imageId}=require('../scripts/seed-admin-images.cjs');
const {defaultContent}=require('../packages/shared');
const original=structuredClone(defaultContent);original.activities[0].image='/api/media/custom.jpeg';original.activities[0].title='Preserve admin edit';original.branding={welcomeImage:'',logo:'data:image/png;base64,custom'};
const migrated=migrateImageReferences(original,{'/media/camp.png':'/api/media/camp-id.png'});
assert.equal(migrated.activities[0].title,'Preserve admin edit');assert.equal(migrated.activities[0].image,'/api/media/custom.jpeg');assert.equal(migrated.branding.welcomeImage,'');assert.equal(migrated.branding.logo,original.branding.logo);assert.equal(original.announcements[0].image,'/media/camp.png');
assert.equal(imageId('same',Buffer.from('same')),imageId('same',Buffer.from('same')));
const assetMap=require('../apps/mobile/starter-image-map.json');
for(const [url,asset] of Object.entries(assetMap)){
 const name=asset.split('/').at(-1), bytes=require('node:fs').readFileSync('apps/admin/public/media/'+name);
 assert.equal(url,'/api/media/'+imageId(name,bytes));
}

function fixture(initial,concurrent=false){
 let row=initial?{content:structuredClone(initial),updated_at:'2026-01-01'}:null,writes=0,race=concurrent;
 const uploaded=new Set();
 const client={storage:{getBucket:async()=>({data:{public:false}}),from:()=>({upload:async id=>{if(uploaded.has(id))return{error:{statusCode:'409'}};uploaded.add(id);return{error:null}}})},from:()=>({
  select:()=>({eq:()=>({maybeSingle:async()=>({data:structuredClone(row)})})}),
  insert:async value=>{writes++;row={content:value.content,updated_at:value.updated_at};return{error:null}},
  update:value=>({eq:()=>({eq:()=>({select:async()=>{
   if(race){race=false;row.content.activities[0].title='Concurrent admin edit';row.updated_at='new-time';return{data:[]};}
   writes++;row={content:value.content,updated_at:value.updated_at};return{data:[{id:'main'}]};
  }})})}),
 })};
 return {client,get:()=>row,writes:()=>writes,uploaded};
}
(async()=>{
 const f=fixture();await seed(f.client,name=>Buffer.from(name));assert.equal(f.uploaded.size,4);assert.equal(f.writes(),1);assert(f.get().content.branding.welcomeImage.startsWith('/api/media/'));
 await seed(f.client,name=>Buffer.from(name));assert.equal(f.writes(),1,'Repeated builds must not rewrite content');
 const r=fixture(original,true);await seed(r.client,name=>Buffer.from(name));assert.equal(r.get().content.activities[0].title,'Concurrent admin edit');assert.equal(r.get().content.activities[0].image,'/api/media/custom.jpeg');assert.equal(r.get().content.branding.welcomeImage,'');
 const bad=fixture();bad.client.storage.getBucket=async()=>({data:{public:true}});await assert.rejects(seed(bad.client,()=>Buffer.from('image')),/private/);assert.equal(bad.writes(),0);
 console.log('PASS: starter-photo import is idempotent, requires private storage and preserves custom photos, explicit removals and concurrent admin changes.');
})().catch(e=>{console.error(e);process.exit(1)});
