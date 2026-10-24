const crypto = require('node:crypto');
const {defaultContent, normalizeContent} = require('../../../packages/shared');
const cookieName = 'spark_admin';
const configured = () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.ADMIN_PASSWORD || '').length >= 16;
function authenticated(request) {
  if (!configured()) return false;
  const cookie = (request.headers.get('cookie') || '').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='));
  if (!cookie) return false;
  const [expires, nonce, signature] = cookie.slice(cookieName.length+1).split('.');
  if (!/^\d{13}$/.test(expires || '') || Number(expires) < Date.now() || !/^[a-f0-9]{32}$/.test(nonce || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const expected = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD).update(expires+'.'+nonce).digest('hex');
  return signature.length===expected.length && crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
function cookie(password, secure) {
  const expires = String(Date.now()+8*60*60*1000), nonce=crypto.randomBytes(16).toString('hex');
  const sig=crypto.createHmac('sha256',password).update(expires+'.'+nonce).digest('hex');
  return `${cookieName}=${expires}.${nonce}.${sig}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure?'; Secure':''}`;
}
function sameOrigin(request) {
  const origin=request.headers.get('origin');
  return !origin || origin===new URL(request.url).origin;
}
function validPassword(value) {
  const digest=v=>crypto.createHash('sha256').update(v).digest();
  return typeof value==='string' && value.length<=1024 && crypto.timingSafeEqual(digest(value),digest(process.env.ADMIN_PASSWORD||''));
}
function validateContent(value) {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Invalid content');
  for(const key of ['activities','announcements','galleries','journeys','comments']) {
    if (!Array.isArray(value[key]) || value[key].length>500) throw new Error('Invalid content collection');
    if (!value[key].every(item=>item&&typeof item==='object'&&typeof item.id==='string')) throw new Error('Invalid content item');
  }
  return normalizeContent(value);
}
function publicContent(value) {
  const c=validateContent(value);
  return {schemaVersion:c.schemaVersion,registrationTestMode:c.registrationTestMode,
    ...(c.branding?{branding:{
      ...(typeof c.branding.logo==='string'?{logo:c.branding.logo}:{}),
      ...(typeof c.branding.welcomeImage==='string'?{welcomeImage:c.branding.welcomeImage}:{}),
    }}:{}),
    activities:c.activities.filter(x=>x.published),
    announcements:c.announcements.filter(x=>x.published),
    galleries:c.galleries.filter(x=>x.published),
    journeys:c.journeys.filter(x=>x.published&&x.audience==='campers'),
    comments:[],
  };
}
function imageType(bytes) {
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';
  return null;
}
module.exports={configured,authenticated,cookie,sameOrigin,validPassword,validateContent,publicContent,imageType,defaultContent};
