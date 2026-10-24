const assert=require('node:assert/strict');
const {resolveMediaSource}=require('../apps/mobile/media-source');
const bundled={'/media/camp.png':17,'/media/trail.png':18,'/media/team.png':19,'/media/spark-logo.png':20};
for(const platform of ['android','ios']){
 for(const [path,asset]of Object.entries(bundled))assert.equal(resolveMediaSource(path,platform,bundled),asset);
 assert.deepEqual(resolveMediaSource('/api/media/123.jpeg',platform,bundled),{uri:'https://sparkyouth.vercel.app/api/media/123.jpeg'});
 assert.deepEqual(resolveMediaSource('https://images.example/test.jpg',platform,bundled),{uri:'https://images.example/test.jpg'});
 assert.deepEqual(resolveMediaSource('data:image/jpeg;base64,abc',platform,bundled),{uri:'data:image/jpeg;base64,abc'});
}
assert.deepEqual(resolveMediaSource('/media/camp.png','web',bundled),{uri:'/media/camp.png'});
for(const value of [null,undefined,'','javascript:alert(1)','//foreign.example/image.jpg'])assert.equal(resolveMediaSource(value,'android',bundled),null);
const service=require('../apps/admin/lib/content-service.cjs');
const previous={password:process.env.ADMIN_PASSWORD,token:process.env.SUPABASE_SERVICE_ROLE_KEY,url:process.env.SUPABASE_URL};
try{
 process.env.ADMIN_PASSWORD='fixture-password-for-local-tests';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-token-not-for-remote-use';process.env.SUPABASE_URL='https://fixture.example';
 assert(service.configured());
 const signed=service.cookie(process.env.ADMIN_PASSWORD,true);
 assert(signed.includes('HttpOnly')&&signed.includes('SameSite=Strict')&&signed.includes('Secure'));
 const request=(value)=>new Request('https://spark.example/api/admin/content',{headers:{cookie:value}});
 assert(service.authenticated(request(signed)));
 assert(!service.authenticated(request(signed.replace(/spark_admin=./,'spark_admin=x'))));
 assert(!service.authenticated(request('spark_admin=9999999999999.'+'a'.repeat(32)+'.'+'é'.repeat(64))));
 assert(!service.authenticated(request('')));
 assert(service.validPassword(process.env.ADMIN_PASSWORD));assert(!service.validPassword('wrong'));
 assert(!service.sameOrigin(new Request('https://spark.example/api/media',{headers:{origin:'https://foreign.example'}})));
 const c=structuredClone(service.defaultContent);c.announcements.push({id:'draft',published:false,title:'Private draft'});
 c.journeys.push({id:'leader-private',published:true,audience:'leaders',title:'Private leadership content'});
 c.privateAdminSetting='private-fixture';
 const publicData=service.publicContent(c);
 assert.equal(publicData.privateAdminSetting,undefined);
 assert(!publicData.announcements.some(x=>x.id==='draft'));
 assert(!publicData.journeys.some(x=>x.audience==='leaders'));
 assert.deepEqual(publicData.comments,[]);
 assert.throws(()=>service.validateContent({activities:'bad'}));
 assert.equal(service.imageType(Buffer.from('<svg onload="alert(1)">')),null);
 assert.equal(service.imageType(require('node:fs').readFileSync('apps/admin/public/media/team.png')),'png');
}finally{
 for(const [key,value]of [['ADMIN_PASSWORD',previous.password],['SUPABASE_SERVICE_ROLE_KEY',previous.token],['SUPABASE_URL',previous.url]])if(value===undefined)delete process.env[key];else process.env[key]=value;
}
console.log('PASS: bundled native photos, remote/data images, invalid image paths, signed admin sessions, cookie tampering, origin checks, private content filtering and file-type checks.');
