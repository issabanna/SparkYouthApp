const {createHash}=require('node:crypto');
const attempts=new Map();let resetAt=0,total=0;
function allowSignup(request,email){
 const now=Date.now();if(now>=resetAt){attempts.clear();total=0;resetAt=now+3600000;}
 const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown';
 const emailKey='email:'+createHash('sha256').update(email.toLowerCase()).digest('hex'),ipKey='ip:'+createHash('sha256').update(ip).digest('hex');
 if(total>=1000||(attempts.get(emailKey)||0)>=10||(attempts.get(ipKey)||0)>=500)return false;
 total++;attempts.set(emailKey,(attempts.get(emailKey)||0)+1);attempts.set(ipKey,(attempts.get(ipKey)||0)+1);return true;
}
async function emailSignupEnabled(){
 const response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/settings',{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Auth settings unavailable');const settings=await response.json();return settings.disable_signup!==true&&settings.external?.email!==false;
}
module.exports={allowSignup,emailSignupEnabled};
