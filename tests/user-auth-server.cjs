const auth=require('./auth-fixtures.cjs').createAuthFixture();
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {request,chromium}=require('playwright');
const shared=require('../packages/shared');
const leaders=require('../packages/shared/leaders');
const root=path.resolve(__dirname,'..'),base='http://localhost:3064',password='test-only-leader-admin-password';
const contentBase=shared.normalizeContent({...shared.defaultContent,activities:[{id:'camp-one',title:'مخيم الاختبار',kind:'camp',published:true,leaderAbout:'وصف خاص للمرشدين',leaderLinks:[{title:'تقييم المخيم',url:'https://example.com/event'}],leaderTeamImage:'/media/team.png'},{id:'camp-two',title:'مخيم آخر',kind:'camp',published:true}],leaderSettings:{generalLinks:[{title:'دليل المرشد',url:'https://example.com/guide'}]}});
let content=contentBase;const rows=new Map(),versions=new Map(),photos=new Map();let conflicts=0,forceConflict=true;
function summary(r){const {receipt,...rest}=structuredClone(r);delete rest.details.idDocument;return {...rest,hasReceipt:!!r.receipt?.uri,hasIdDocument:!!r.details.idDocument?.uri};}
const db=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks);const value=(req.headers['content-type']||'').includes('application/json')&&bytes.length?JSON.parse(bytes.toString()):{};
 assert.equal(req.headers.apikey,'test-service-role-only');
 const authResult=auth.handle(req,url,value);if(authResult){res.writeHead(authResult.status,{'Content-Type':'application/json'});res.end(JSON.stringify(authResult.body));return;}
 let result;
 if(url.pathname.startsWith('/storage/v1/object/')){
  const id=url.pathname.split('/').pop();
  if(req.method==='POST'){await new Promise(r=>setTimeout(r,200));photos.set(id,bytes);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({Key:'spark-content-media/'+id}));return;}
  if(!photos.has(id)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(photos.get(id));return;
 }
 if(url.pathname==='/rest/v1/spark_content'){
  if(req.method==='POST'){content=value.content;result=null;}else result=[{content}];
 }
 else if(url.pathname==='/rest/v1/spark_registrations'){const id=url.searchParams.get('id').replace(/^eq\./,'');const row=rows.get(id);result=row?[row]:[];}
 else if(url.pathname.endsWith('/spark_registration_list'))result=[...rows.values()].filter(r=>!value.p_owner_hash||r.owner_hash===value.p_owner_hash).map(r=>summary(r.record));
 else if(url.pathname.endsWith('/spark_registration_occupancy'))result=[...rows.values()].map(r=>r.record).filter(r=>['Pending','Confirmed'].includes(r.status)).map(r=>({id:r.id,activityId:r.activityId,status:r.status,details:{tentNumber:r.details.tentNumber}}));
 else if(url.pathname.endsWith('/spark_registration_snapshot'))result={version:versions.get(value.p_activity)||0,records:[...rows.values()].filter(r=>r.record.activityId===value.p_activity).map(r=>summary(r.record))};
 else if(url.pathname.endsWith('/spark_registration_commit')){
  const version=versions.get(value.p_activity)||0;
  if(forceConflict){forceConflict=false;versions.set(value.p_activity,version+1);conflicts++;result=false;}
  else if(version!==value.p_version){conflicts++;result=false;}else{
   const old=rows.get(value.p_record.id);if(old)assert.equal(old.owner_hash,value.p_owner_hash);
   rows.set(value.p_record.id,{owner_hash:value.p_owner_hash,record:value.p_record});versions.set(value.p_activity,version+1);result=true;
  }
 }else throw Error('Unexpected database path '+url.pathname);
 res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({message:e.message}));}});
(async()=>{
 await new Promise(resolve=>db.listen(3063,'127.0.0.1',resolve));
 const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3064'],{cwd:path.join(root,'apps/admin'),env:{...process.env,SUPABASE_URL:'http://127.0.0.1:3063',SUPABASE_SERVICE_ROLE_KEY:'test-service-role-only',ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 const api=await request.newContext();let browser,page;
 const json=async(response,status=200)=>{assert.equal(response.status(),status,await response.text());return response.json()};
 const send=data=>api.post(base+'/api/auth',{data});
 try{
  for(let i=0;i<100;i++){try{if((await api.get(base+'/api/auth')).status()===200)break}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.equal((await api.post(base+'/api/registrations/session')).status(),401);
  const demo={Authorization:'Bearer '+'a'.repeat(64)};for(const route of ['/api/account','/api/registrations','/api/leaders'])assert.equal((await api.get(base+route,{headers:demo})).status(),401);
  assert.equal((await api.get(base+'/api/account',{headers:{Authorization:'Bearer forged.jwt.signature'}})).status(),401);
  assert.equal((await send({action:'signup',email:'real@example.com',password:'short'})).status(),400);
  assert.equal((await send({action:'login',email:'missing@example.com',password:'Unknown-password-123'})).status(),400);
  auth.requireConfirmation=true;const automatic=await json(await send({action:'signup',email:'confirm@example.com',password:'Confirm-password-123'}));assert.equal(automatic.confirmationRequired,false);assert.ok(automatic.session);assert.equal(auth.user('confirm@example.com').confirmed,true);assert.ok((await json(await send({action:'login',email:'confirm@example.com',password:'Confirm-password-123'}))).session);
  assert.equal((await send({action:'signup',email:'confirm@example.com',password:'Replacement-password-123'})).status(),400);assert.ok((await json(await send({action:'login',email:'confirm@example.com',password:'Confirm-password-123'}))).session);
  auth.user('confirm@example.com').confirmed=false;assert.equal((await send({action:'signup',email:'confirm@example.com',password:'Replacement-password-123'})).status(),400);assert.equal(auth.user('confirm@example.com').confirmed,false);auth.confirm('confirm@example.com');
  auth.disableSignup=true;assert.equal((await send({action:'signup',email:'disabled@example.com',password:'Disabled-password-123'})).status(),400);assert.equal(auth.user('disabled@example.com'),undefined);auth.disableSignup=false;
  auth.requireConfirmation=false;const anonymousSession=(await json(await send({action:'signup',email:'anonymous@example.com',password:'Anonymous-password-123'}))).session;auth.user('anonymous@example.com').is_anonymous=true;assert.equal((await api.get(base+'/api/account',{headers:{Authorization:'Bearer '+anonymousSession.access_token}})).status(),401);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{localStorage.setItem('spark-registration-session-v1','a'.repeat(64));localStorage.setItem('spark-camp-profile-v1',JSON.stringify({user:{name:'Old Demo',role:'approvedLeader'},account:{details:{englishFirstName:'Old Demo'}},completed:[],reflections:{}}))});page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/app');await page.getByRole('button',{name:'إنشاء حساب جديد',exact:true}).waitFor();assert.equal(await page.getByRole('tab',{name:'حسابي',exact:true}).count(),0);assert.equal(await page.getByText('Old Demo',{exact:true}).count(),0);assert.equal(await page.getByText('كل مخيم بداية حكاية',{exact:true}).count(),0);assert.equal(await page.getByLabel('الاسم الأول بالإنجليزية',{exact:true}).count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('spark-registration-session-v1')),null);
  await page.getByRole('button',{name:'إنشاء حساب جديد',exact:true}).click();await page.getByLabel('البريد الإلكتروني',{exact:true}).fill('real@example.com');await page.getByLabel('كلمة السر',{exact:true}).fill('Real-password-123');await page.getByLabel('تأكيد كلمة السر',{exact:true}).fill('Real-password-123');await page.getByRole('button',{name:'إنشاء الحساب',exact:true}).click();await page.getByLabel('الاسم الأول بالإنجليزية',{exact:true}).waitFor();
  for(const [label,value]of [['الاسم الأول بالإنجليزية','Real'],['اسم الأب بالإنجليزية','Parent'],['اسم العائلة بالإنجليزية','User'],['رقم الهاتف','0790000000'],['الرقم الوطني / رقم الهوية','REAL-12345']])await page.getByLabel(label,{exact:true}).fill(value);
  const city=page.getByLabel('مدينة السكن',{exact:true});if(await city.evaluate(el=>el.tagName==='SELECT'))await city.selectOption({index:1});else await city.fill('عمّان');
  await page.getByRole('button',{name:'اختيار تاريخ الميلاد',exact:true}).click();await page.getByLabel('سنة الميلاد',{exact:true}).selectOption('1990');await page.getByRole('button',{name:'1990-01-01',exact:true}).click();await page.getByLabel('الجنس',{exact:true}).selectOption('male');await page.getByRole('button',{name:'حفظ ومتابعة',exact:true}).click();await page.getByRole('tab',{name:'حسابي',exact:true}).click();await page.getByText('Real',{exact:true}).waitFor();
  const savedSession=await page.evaluate(()=>JSON.parse(localStorage.getItem('spark-auth-session-v1')));const owner={Authorization:'Bearer '+savedSession.access_token};const account=(await json(await api.get(base+'/api/account',{headers:owner}))).account;assert.equal(account.authUserId,savedSession.user.id);assert.equal(account.details.englishFirstName,'Real');
  // A second login gets a different JWT but the same private account owner.
  const second=(await json(await send({action:'login',email:'real@example.com',password:'Real-password-123'}))).session;assert.notEqual(second.access_token,savedSession.access_token);assert.equal((await json(await api.get(base+'/api/account',{headers:{Authorization:'Bearer '+second.access_token}}))).account.id,account.id);
  const stranger=(await json(await send({action:'signup',email:'other@example.com',password:'Other-password-123'}))).session;assert.equal((await json(await api.get(base+'/api/account',{headers:{Authorization:'Bearer '+stranger.access_token}}))).account,null);
  await page.getByRole('button',{name:'تعديل كلمة السر',exact:true}).click();await page.getByLabel('كلمة السر الحالية',{exact:true}).fill('Wrong-password');await page.getByLabel('كلمة السر الجديدة',{exact:true}).fill('Updated-password-456');await page.getByLabel('تأكيد كلمة السر الجديدة',{exact:true}).fill('Updated-password-456');await page.getByRole('button',{name:'حفظ كلمة السر',exact:true}).click();await page.getByText('كلمة السر الحالية غير صحيحة.',{exact:true}).waitFor();await page.getByLabel('كلمة السر الحالية',{exact:true}).fill('Real-password-123');await page.getByRole('button',{name:'حفظ كلمة السر',exact:true}).click();await page.getByText('تم تحديث كلمة السر.',{exact:true}).waitFor();assert.equal((await send({action:'login',email:'real@example.com',password:'Real-password-123'})).status(),400);await json(await send({action:'login',email:'real@example.com',password:'Updated-password-456'}));
  await page.getByRole('button',{name:'العودة إلى حسابي',exact:true}).click();await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).click();await page.getByRole('button',{name:'دخول',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('spark-auth-session-v1')),null);assert.equal(await page.getByRole('tab',{name:'حسابي',exact:true}).count(),0);
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill('real@example.com');await page.getByLabel('كلمة السر',{exact:true}).fill('Updated-password-456');await page.getByRole('button',{name:'دخول',exact:true}).click();await page.getByRole('tab',{name:'حسابي',exact:true}).click();await page.getByText('Real',{exact:true}).waitFor();
  const fresh=await page.evaluate(()=>JSON.parse(localStorage.getItem('spark-auth-session-v1')));const expired={...fresh,expires_at:Math.floor(Date.now()/1000)-1};const refreshContext=await browser.newContext({viewport:{width:390,height:844}});await refreshContext.addInitScript(session=>localStorage.setItem('spark-auth-session-v1',JSON.stringify(session)),expired);const refreshedPage=await refreshContext.newPage();await refreshedPage.goto(base+'/app');await refreshedPage.getByRole('tab',{name:'حسابي',exact:true}).waitFor();assert.notEqual(await refreshedPage.evaluate(()=>JSON.parse(localStorage.getItem('spark-auth-session-v1')).refresh_token),fresh.refresh_token);
  // Confirmation callback consumes tokens, verifies them on the server and removes the fragment.
  const callback=(await json(await send({action:'login',email:'confirm@example.com',password:'Confirm-password-123'}))).session;const callbackContext=await browser.newContext();const callbackPage=await callbackContext.newPage();await callbackPage.goto(base+'/app#'+new URLSearchParams({access_token:callback.access_token,refresh_token:callback.refresh_token,expires_in:'3600',type:'signup'}));await callbackPage.getByLabel('الاسم الأول بالإنجليزية',{exact:true}).waitFor();assert.equal(await callbackPage.evaluate(()=>location.hash),'');assert.equal(await callbackPage.evaluate(()=>JSON.parse(localStorage.getItem('spark-auth-session-v1')).user.email),'confirm@example.com');
  assert.deepEqual(errors,[]);console.log('PASS real signup/login/password/logout, automatic new-account confirmation, duplicate-account protection, signup policy, stable cross-device ownership, refresh rotation, server JWT verification and disabled demo/anonymous entry.');
 }catch(e){console.error(log);if(page)console.error((await page.locator('body').innerText()).slice(-4000));throw e}finally{await browser?.close();await api.dispose();server.kill('SIGTERM');db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
