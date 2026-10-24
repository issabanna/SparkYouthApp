const assert=require('node:assert/strict');
const fs=require('node:fs');
const {normalizeActivity,validateDetails}=require('../packages/shared');
const {parseImage,normalizeResult,checkImage}=require('../apps/admin/lib/registration-image-check.cjs');
const image='data:image/png;base64,'+fs.readFileSync('apps/admin/public/media/team.png').toString('base64');
assert.equal(parseImage(image),image);
for(const invalid of ['https://example.com/a.jpg','data:image/jpeg;base64,aGVsbG8=','data:image/svg+xml;base64,PHN2Zz4='])assert.throws(()=>parseImage(invalid));
for(const kind of ['id_document','personal_photo'])assert.equal(normalizeResult({kind,clear:true,confidence:.95}).accepted,true);
for(const result of [{kind:'other',clear:true,confidence:.99},{kind:'unclear',clear:false,confidence:.9},{kind:'id_document',clear:false,confidence:.9},{kind:'personal_photo',clear:true,confidence:.6}])assert.equal(normalizeResult(result).accepted,false);
assert.throws(()=>normalizeResult({kind:'personal_photo',clear:true}));
const details={idDocument:{uri:image,aiCheck:{status:'unavailable',accepted:false}}};
const activity=normalizeActivity({kind:'camp',registrationTestMode:true,idImageCheckPolicy:'warn'});
assert.equal(validateDetails(details,activity,'extra').idDocument,undefined);
const strict={...activity,idImageCheckPolicy:'reject'};
assert.ok(validateDetails(details,strict,'extra').idDocument);
assert.ok(validateDetails({...details,idDocument:{uri:image,aiCheck:{status:'checked',accepted:false}}},strict,'extra').idDocument);
assert.equal(validateDetails({...details,idDocument:{uri:image,aiCheck:{status:'checked',accepted:true}}},strict,'extra').idDocument,undefined);
(async()=>{
 const result=await checkImage(image,{apiKey:'test-only',fetcher:async(url,request)=>{
   assert.equal(url,'https://api.openai.com/v1/chat/completions');const body=JSON.parse(request.body);assert.equal(body.store,false);assert.equal(body.messages[1].content[0].image_url.url,image);
   return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({kind:'personal_photo',clear:true,confidence:.95})}}]})};
 }});
 assert.equal(result.accepted,true);
 await assert.rejects(checkImage(image,{apiKey:'test-only',fetcher:async()=>({ok:false})}));
 console.log('PASS: image byte validation, constrained classification, portrait/document acceptance, unclear warnings, strict rejection, service errors and API request contract (mocked; no paid request)');
})().catch(e=>{console.error(e);process.exit(1)});
