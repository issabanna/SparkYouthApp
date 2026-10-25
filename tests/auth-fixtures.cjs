const {randomUUID,randomBytes}=require('node:crypto');
function createAuthFixture(){
 const users=new Map(),tokens=new Map(),refreshes=new Map();let requireConfirmation=false;
 const sessionFor=(user)=>{const exp=Math.floor(Date.now()/1000)+3600,access=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp,nonce:randomBytes(6).toString('hex')})).toString('base64url'),randomBytes(24).toString('base64url')].join('.'),refresh=randomBytes(32).toString('hex');const session={access_token:access,refresh_token:refresh,expires_in:3600,expires_at:exp,token_type:'bearer',user:publicUser(user)};tokens.set(access,session);refreshes.set(refresh,session);return session;};
 const publicUser=u=>({id:u.id,email:u.email,aud:'authenticated',role:'authenticated',email_confirmed_at:u.confirmed?new Date().toISOString():null,app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()});
 const failure=(code,message)=>({status:400,body:{code,error_code:code,msg:message}});
 return {set requireConfirmation(v){requireConfirmation=v},confirm(email){users.get(email).confirmed=true},sessionForToken:token=>tokens.get(token),user:email=>users.get(email),
 handle(req,url,value){
  if(!url.pathname.startsWith('/auth/v1/'))return null;
  const bearer=(req.headers.authorization||'').replace(/^Bearer /,''),session=tokens.get(bearer);
  if(url.pathname.endsWith('/signup')){if(users.has(value.email))return failure('user_already_exists','User already exists');const user={id:randomUUID(),email:value.email,password:value.password,confirmed:!requireConfirmation};users.set(user.email,user);return {status:200,body:user.confirmed?sessionFor(user):{user:publicUser(user)}};}
  if(url.pathname.endsWith('/token')){
   if(url.searchParams.get('grant_type')==='refresh_token'){const prior=refreshes.get(value.refresh_token);if(!prior)return failure('refresh_token_not_found','Invalid refresh token');refreshes.delete(value.refresh_token);return {status:200,body:sessionFor(users.get(prior.user.email))};}
   const user=users.get(value.email);if(!user||user.password!==value.password)return failure('invalid_credentials','Invalid login credentials');if(!user.confirmed)return failure('email_not_confirmed','Email not confirmed');return {status:200,body:sessionFor(user)};
  }
  if(url.pathname.endsWith('/user')){if(!session)return {status:401,body:{code:'bad_jwt',msg:'Invalid JWT'}};const user=users.get(session.user.email);if(req.method==='PUT'){if(value.password)user.password=value.password;}return {status:200,body:publicUser(user)};}
  if(url.pathname.endsWith('/logout')){if(session)for(const [key,s]of refreshes)if(s.user.id===session.user.id)refreshes.delete(key);return {status:200,body:{}};}
  throw Error('Unexpected auth path '+url.pathname);
 }};
}
module.exports={createAuthFixture};
