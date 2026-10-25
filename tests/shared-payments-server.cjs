const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {request,chromium}=require('playwright');
const shared=require('../packages/shared');
const {demoImage,pickImage}=require('./camp-fixtures.cjs');
const root=path.resolve(__dirname,'..'),base='http://localhost:3051';
const password='test-only-payment-admin-password';
const activity=shared.normalizeActivity({id:'shared-camp',kind:'camp',title:'Shared payment camp',text:'Test',published:true,capacity:20,tentsEnabled:true,fees:10,requireReceipt:true,tents:shared.defaultTents().map(t=>({...t,capacity:1})),afterRegistrationInstructions:'PAYMENT INSTRUCTIONS',approvedInstructions:'APPROVED SECRET'});
const content=shared.normalizeContent({...shared.defaultContent,registrationTestMode:true,activities:[activity]});
const rows=new Map(),versions=new Map();let conflicts=0,debugPage,forceConflict=true;
function summary(r){const {receipt,...rest}=structuredClone(r);delete rest.details.idDocument;return {...rest,hasReceipt:!!r.receipt?.uri,hasIdDocument:!!r.details.idDocument?.uri};}
const db=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');let body='';for await(const chunk of req)body+=chunk;const value=body?JSON.parse(body):{};
 assert.equal(req.headers.apikey,'test-service-role-only');
 let result;
 if(url.pathname==='/rest/v1/spark_content')result=[{content}];
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
 await new Promise(resolve=>db.listen(3050,'127.0.0.1',resolve));
 const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3051'],{cwd:path.join(root,'apps/admin'),env:{...process.env,SUPABASE_URL:'http://127.0.0.1:3050',SUPABASE_SERVICE_ROLE_KEY:'test-service-role-only',ADMIN_PASSWORD:password,OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 const api=await request.newContext();let browser;
 try{
  for(let i=0;i<60;i++){try{if((await api.get(base+'/api/registrations')).status()===401)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  const makeOwner=async()=>{const response=await api.post(base+'/api/registrations/session');assert.equal(response.status(),200);const {token}=await response.json();return {Authorization:'Bearer '+token};};
  const owner=await makeOwner(),other=await makeOwner();
  const send=async(headers,data)=>api.post(base+'/api/registrations',{headers,data});
  let response=await send(owner,{action:'submit',activityId:activity.id,name:'Parent',details:{gender:'male',tentNumber:'0'},consent:true});assert.equal(response.status(),200,await response.text());let result=await response.json(),id=result.recordId;
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const ownerContext=await browser.newContext({viewport:{width:390,height:844}}),page=await ownerContext.newPage(),browserErrors=[];
  debugPage=page;page.on('pageerror',e=>browserErrors.push(e.message));
  await ownerContext.addInitScript(token=>localStorage.setItem('spark-registration-session-v1',token),owner.Authorization.slice(7));
  await page.goto(base+'/app');await page.getByLabel('اسمك في المعاينة').fill('Parent');await page.getByRole('button',{name:'دخول تجريبي'}).click();
  await page.getByRole('tab',{name:'الأنشطة',exact:true}).click();await page.getByRole('button',{name:'تسجيلاتي',exact:true}).click();await page.getByText('بانتظار الدفع',{exact:true}).waitFor();
  await page.getByText('PAYMENT INSTRUCTIONS',{exact:true}).waitFor();assert.equal(await page.getByText('APPROVED SECRET',{exact:true}).count(),0);
  await page.getByRole('button',{name:'تحميل وصل الإيداع',exact:true}).click();await pickImage(page,'اختيار صورة الوصل');await page.getByLabel('الرقم المرجعي للوصل',{exact:true}).fill('PAY-BROWSER');await page.getByRole('button',{name:'تأكيد رفع الوصل',exact:true}).click();await page.getByText('الوصل قيد المراجعة',{exact:true}).waitFor();
  await page.reload();await page.getByRole('tab',{name:'الأنشطة',exact:true}).click();await page.getByRole('button',{name:'تسجيلاتي',exact:true}).click();await page.getByText('الوصل قيد المراجعة',{exact:true}).waitFor();
  assert.equal(result.records[0].instructionText,'PAYMENT INSTRUCTIONS');assert.equal(shared.registrationStatusLabel(result.records[0]),'بانتظار الدفع');assert.ok(!JSON.stringify(result).includes('APPROVED SECRET'));
  assert.equal((await (await api.get(base+'/api/registrations',{headers:other})).json()).records.length,0);
  assert.equal((await send(other,{action:'receipt',id,image:demoImage(),reference:'WRONG'})).status(),404);
  const admin=await request.newContext();assert.equal((await admin.post(base+'/api/admin/session',{data:{password}})).status(),200);
  assert.equal((await admin.post(base+'/api/admin/registrations',{data:{action:'status',id,status:'Confirmed'}})).status(),409);
  response=await send(owner,{action:'receipt',id,image:demoImage(),reference:'PAY-001'});assert.equal(response.status(),200,await response.text());result=await response.json();assert.equal(shared.registrationStatusLabel(result.records[0]),'الوصل قيد المراجعة');
  const dashboard=await (await admin.get(base+'/api/admin/registrations')).json();assert.equal(dashboard.records[0].receiptReference,'PAY-001');const imageUrl=dashboard.records[0].receipt.uri;
  assert.equal((await api.get(base+imageUrl)).status(),401);assert.equal((await admin.get(base+imageUrl)).status(),200);
  const adminContext=await browser.newContext({storageState:await admin.storageState()}),adminPage=await adminContext.newPage();
  await adminPage.goto(base);await adminPage.getByRole('button',{name:'طلبات التسجيل',exact:true}).click();await adminPage.getByText('PAY-001',{exact:false}).waitFor();
  await adminPage.getByRole('button',{name:'طلب تصحيح الوصل',exact:true}).click();await adminPage.getByRole('status').filter({hasText:'تم تحديث الطلب.'}).waitFor();

  result=await (await api.get(base+'/api/registrations',{headers:owner})).json();assert.equal(shared.registrationStatusLabel(result.records[0]),'بانتظار الدفع');
  await send(owner,{action:'receipt',id,image:demoImage(),reference:'PAY-002'});
  await adminPage.reload();await adminPage.getByRole('button',{name:'طلبات التسجيل',exact:true}).click();await adminPage.getByText('PAY-002',{exact:false}).waitFor();await adminPage.getByRole('button',{name:'قبول الوصل واعتماد الطلب',exact:true}).click();await adminPage.getByRole('status').filter({hasText:'تم قبول الوصل واعتماد الطلب.'}).waitFor();

  result=await (await api.get(base+'/api/registrations',{headers:owner})).json();assert.equal(result.records[0].status,'Confirmed');assert.equal(result.records[0].instructionText,'APPROVED SECRET');
  await page.reload();await page.getByRole('tab',{name:'الأنشطة',exact:true}).click();await page.getByRole('button',{name:'تسجيلاتي',exact:true}).click();await page.getByText('APPROVED SECRET',{exact:true}).waitFor();assert.equal(await page.getByText('PAYMENT INSTRUCTIONS',{exact:true}).count(),0);assert.deepEqual(browserErrors,[]);
  const publicData=await (await api.get(base+'/api/content')).json();assert.ok(!JSON.stringify(publicData).includes('APPROVED SECRET'));
  const c=await makeOwner(),d=await makeOwner();const racing=await Promise.all([c,d].map(headers=>send(headers,{action:'submit',activityId:activity.id,name:'Concurrent camper',details:{gender:'male',tentNumber:'1'},consent:true})));
  assert.deepEqual(racing.map(r=>r.status()).sort(),[200,409]);assert.equal([...rows.values()].filter(r=>r.record.details.tentNumber===1).length,1);
  assert.equal((await api.post(base+'/api/admin/registrations',{data:{action:'receipt',id,decision:'accepted'}})).status(),401);
  console.log('PASS: real Next APIs + mocked Supabase RPC contract: ownership isolation, private receipt dashboard, rejection/re-upload, approval-only instructions, concurrent tent allocation, admin authorization; conflicts retried:',conflicts);
  await admin.dispose();
 }catch(e){console.error(log);if(debugPage)console.error((await debugPage.locator('body').innerText()).slice(-6000));console.error([...rows.values()].map(r=>({id:r.record.id,status:r.record.status,receiptStatus:r.record.receiptStatus})));throw e;}finally{if(browser)await browser.close();await api.dispose();server.kill('SIGTERM');db.close();}
})().catch(e=>{console.error(e);process.exit(1)});
