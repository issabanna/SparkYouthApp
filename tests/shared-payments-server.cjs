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
let content=shared.normalizeContent({...shared.defaultContent,registrationTestMode:true,activities:[activity]});
const rows=new Map(),versions=new Map(),photos=new Map();let conflicts=0,debugPage,forceConflict=true;
function summary(r){const {receipt,...rest}=structuredClone(r);delete rest.details.idDocument;return {...rest,hasReceipt:!!r.receipt?.uri,hasIdDocument:!!r.details.idDocument?.uri};}
const db=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks);const value=(req.headers['content-type']||'').includes('application/json')&&bytes.length?JSON.parse(bytes.toString()):{};
 assert.equal(req.headers.apikey,'test-service-role-only');
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
  await adminPage.goto(base);await adminPage.getByRole('button',{name:'طلبات التسجيل',exact:true}).click();
  assert.deepEqual(await adminPage.getByRole('columnheader').allTextContents(),['اسم المشارك','المخيم / النشاط','الحالة']);
  assert.equal(await adminPage.getByText('PAY-001',{exact:false}).count(),0);
  await adminPage.getByTestId('registration-row-'+id).getByRole('button').click();await adminPage.getByText('PAY-001',{exact:false}).waitFor();
  await adminPage.getByRole('button',{name:'طلب تصحيح الوصل',exact:true}).click();await adminPage.getByRole('status').filter({hasText:'تم تحديث الطلب.'}).waitFor();

  result=await (await api.get(base+'/api/registrations',{headers:owner})).json();assert.equal(shared.registrationStatusLabel(result.records[0]),'بانتظار الدفع');
  await send(owner,{action:'receipt',id,image:demoImage(),reference:'PAY-002'});
  await adminPage.reload();await adminPage.getByRole('button',{name:'طلبات التسجيل',exact:true}).click();await adminPage.getByTestId('registration-row-'+id).getByRole('button').click();await adminPage.getByText('PAY-002',{exact:false}).waitFor();await adminPage.getByRole('button',{name:'قبول الوصل واعتماد الطلب',exact:true}).click();await adminPage.getByRole('status').filter({hasText:'تم قبول الوصل واعتماد الطلب.'}).waitFor();

  result=await (await api.get(base+'/api/registrations',{headers:owner})).json();assert.equal(result.records[0].status,'Confirmed');assert.equal(result.records[0].instructionText,'APPROVED SECRET');
  await page.reload();await page.getByRole('tab',{name:'الأنشطة',exact:true}).click();await page.getByRole('button',{name:'تسجيلاتي',exact:true}).click();await page.getByText('APPROVED SECRET',{exact:true}).waitFor();assert.equal(await page.getByText('PAYMENT INSTRUCTIONS',{exact:true}).count(),0);assert.deepEqual(browserErrors,[]);
  const publicData=await (await api.get(base+'/api/content')).json();assert.ok(!JSON.stringify(publicData).includes('APPROVED SECRET'));
  const initialAudit=rows.get(id).record.auditLog;
  for(const action of ['submitted','receipt_uploaded','receipt_rejected','receipt_accepted_and_approved'])assert.ok(initialAudit.some(e=>e.action===action));
  assert.equal(result.records[0].auditLog,undefined);
  const waivedSubmission=await send(owner,{action:'submit',activityId:activity.id,name:'Parent',details:{gender:'male',tentNumber:'2'},consent:true,auditLog:[{action:'forged'}]});
  const waivedData=await waivedSubmission.json(),waiverId=waivedData.recordId,waiverRecord=waivedData.records.find(r=>r.id===waiverId);
  assert.equal(rows.get(waiverId).record.auditLog.length,1);assert.equal(rows.get(waiverId).record.auditLog[0].action,'submitted');
  for(const reason of [undefined,'  ','x'])assert.equal((await admin.post(base+'/api/admin/registrations',{data:{action:'approveWithoutReceipt',id:waiverId,reason}})).status(),409);
  assert.equal(rows.get(waiverId).record.status,'Pending');assert.equal(rows.get(waiverId).record.auditLog.length,1);
  rows.get(waiverId).record.status='Waiting';rows.get(waiverId).record.details.tentNumber=null;
  assert.equal((await api.post(base+'/api/admin/registrations',{data:{action:'approveWithoutReceipt',id:waiverId,reason:'forged approval'}})).status(),401);
  await adminPage.reload();await adminPage.getByRole('button',{name:'طلبات التسجيل',exact:true}).click();
  await adminPage.getByTestId('registration-row-'+waiverId).getByRole('button').click();
  await adminPage.getByRole('dialog').getByLabel('تعيين خيمة',{exact:false}).selectOption('2');await adminPage.getByRole('button',{name:'تخصيص المقعد وطلب الدفع',exact:true}).click();await adminPage.getByRole('status').filter({hasText:'تم تحديث الطلب.'}).waitFor();
  await adminPage.getByRole('button',{name:'تعديل بيانات الطلب والخيمة',exact:true}).click();await adminPage.getByRole('dialog').getByLabel('الخيمة',{exact:false}).selectOption('3');await adminPage.getByRole('button',{name:'حفظ تعديلات الطلب',exact:true}).click();await adminPage.getByText('تم حفظ تعديلات الطلب وتسجيلها في سجل الإجراءات.',{exact:true}).waitFor();
  await adminPage.locator('article').filter({hasText:waiverRecord.reference}).getByRole('button',{name:'تأكيد الطلب بدون وصل',exact:true}).click();
  assert.equal(await adminPage.getByRole('button',{name:'حفظ السبب وتأكيد الطلب',exact:true}).isDisabled(),true);
  const reason='تم استلام المبلغ نقدًا لدى الإدارة';await adminPage.getByLabel('سبب التأكيد بدون وصل',{exact:false}).fill(reason);await adminPage.getByRole('button',{name:'حفظ السبب وتأكيد الطلب',exact:true}).click();
  await adminPage.getByText('تم تأكيد الطلب بدون وصل وحفظ السبب في سجل الإجراءات.',{exact:true}).waitFor();
  const waived=rows.get(waiverId).record;assert.equal(waived.status,'Confirmed');assert.equal(waived.receiptStatus,'notSubmitted');assert.equal(waived.paymentWaiver.reason,reason);assert.equal(waived.details.tentNumber,3);assert.equal(waived.auditLog.length,4);assert.equal(waived.auditLog[3].action,'approved_without_receipt');assert.equal(waived.auditLog[3].reason,reason);assert.match(waived.auditLog[3].actor.session,/^[a-f0-9]{12}$/);
  const ownWaived=(await (await api.get(base+'/api/registrations',{headers:owner})).json()).records.find(r=>r.id===waiverId);assert.equal(ownWaived.auditLog,undefined);assert.equal(ownWaived.paymentWaiver,undefined);assert.equal(ownWaived.status,'Confirmed');
  const auditCard=adminPage.locator('article').filter({hasText:waiverRecord.reference});await auditCard.getByText('سجل إجراءات الطلب (4)',{exact:true}).click();await auditCard.getByText('السبب: '+reason,{exact:true}).waitFor();
  console.log('PASS: mandatory waiver justification in UI and API, unauthorized/forged overrides denied, receipt remains unaccepted, atomic private audit and visible admin history');
  await adminPage.getByRole('button',{name:'تعديل بيانات الطلب والخيمة',exact:true}).click();
  await adminPage.getByRole('dialog').getByLabel('الاسم العربي',{exact:false}).fill('اسم معدل للمشارك');
  const tentSelect=adminPage.getByRole('dialog').getByLabel('الخيمة',{exact:false});await tentSelect.selectOption('4');
  await adminPage.getByRole('button',{name:'حفظ تعديلات الطلب',exact:true}).click();await adminPage.getByText('تم حفظ تعديلات الطلب وتسجيلها في سجل الإجراءات.',{exact:true}).waitFor();
  assert.equal(rows.get(waiverId).record.details.tentNumber,4);assert.equal(rows.get(waiverId).record.status,'Confirmed');assert.equal(rows.get(waiverId).record.details.arabicFullName,'اسم معدل للمشارك');assert.equal(rows.get(waiverId).record.auditLog.at(-1).action,'edited');assert.equal(rows.get(waiverId).record.auditLog.at(-1).changes.tentNumber.before,3);
  assert.equal((await admin.post(base+'/api/admin/registrations',{data:{action:'edit',id:waiverId,patch:{tentNumber:'0'},expected:{tentNumber:4}}})).status(),409);
  assert.equal((await admin.post(base+'/api/admin/registrations',{data:{action:'edit',id:waiverId,patch:{tentNumber:'5'},expected:{tentNumber:2}}})).status(),409);
  const compact=await(await admin.get(base+'/api/admin/registrations?compact=true')).json();assert.ok(compact.records.every(r=>!r.auditLog&&!r.receipt&&!r.details.medicalNotes));
  await adminPage.getByRole('button',{name:'إغلاق التفاصيل',exact:true}).click();assert.equal(await adminPage.getByRole('dialog').count(),0);
  console.log('PASS: compact three-column table, lazy detail modal, editable approved camper data/tent, capacity/conflict protection and private audited field changes');
  await adminPage.getByRole('button',{name:'المخيمات والأنشطة',exact:true}).click();await adminPage.getByRole('button',{name:'تعديل',exact:true}).click();
  assert.equal(await adminPage.getByText('استخدام رابط صورة بدل الرفع',{exact:true}).count(),0);assert.equal(await adminPage.getByLabel('رابط الصورة',{exact:true}).count(),0);
  await adminPage.getByRole('button',{name:'استخدام الصورة الافتراضية',exact:true}).click();
  assert.equal(await adminPage.getByAltText('معاينة الصورة 1',{exact:true}).getAttribute('src'),'/media/camp.png');
  await adminPage.getByLabel('رفع صورة النشاط',{exact:false}).setInputFiles({name:'invalid.jpg',mimeType:'image/jpeg',buffer:Buffer.from('invalid-image')});
  await adminPage.getByText('تعذّر قراءة الصورة.',{exact:false}).first().waitFor();
  const uploading=adminPage.waitForRequest(r=>r.url().endsWith('/api/media')&&r.method()==='POST');
  await adminPage.getByLabel('رفع صورة النشاط',{exact:false}).setInputFiles(path.join(__dirname,'../apps/admin/public/media/team.png'));await uploading;await adminPage.getByLabel('العنوان',{exact:true}).fill('Camp photo changed while uploading');
  await adminPage.getByText('تم رفع الصورة بنجاح.',{exact:false}).first().waitFor();assert.equal(await adminPage.getByLabel('العنوان',{exact:true}).inputValue(),'Camp photo changed while uploading');
  await adminPage.getByAltText('معاينة الصورة 1',{exact:true}).evaluate(img=>new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve();img.onload=resolve;img.onerror=()=>reject(Error('Upload preview failed'));}));
  await adminContext.clearCookies();await adminPage.getByLabel('رفع صورة النشاط',{exact:false}).setInputFiles(path.join(__dirname,'../apps/admin/public/media/team.png'));await adminPage.getByLabel('تجديد جلسة رفع الصور').waitFor();
  await adminPage.getByLabel('تجديد جلسة رفع الصور').fill(password);await adminPage.getByRole('button',{name:'تسجيل الدخول ومتابعة التحرير',exact:true}).click();await adminPage.getByText('تم تجديد الجلسة.',{exact:false}).waitFor();
  await adminPage.getByLabel('رفع صورة النشاط',{exact:false}).setInputFiles(path.join(__dirname,'../apps/admin/public/media/team.png'));await adminPage.getByText('تم رفع الصورة بنجاح.',{exact:false}).first().waitFor();
  const photoPath=await adminPage.getByAltText('معاينة الصورة 1',{exact:true}).getAttribute('src');assert.match(photoPath,/^\/api\/media\/[a-f0-9-]+\.jpeg$/);
  await adminPage.getByRole('button',{name:'حفظ المحتوى',exact:true}).click();await adminPage.getByRole('button',{name:'نشر التغييرات للتطبيق',exact:true}).click();await adminPage.getByText('تم النشر.',{exact:false}).waitFor();
  assert.equal((await (await api.get(base+'/api/content')).json()).activities[0].image,photoPath);assert.equal((await api.get(base+photoPath)).status(),200);
  console.log('PASS: real authenticated photo upload/storage/download, invalid-image feedback, expired-session reauthentication without losing edits, default images, no manual links, save and publish');
  const c=await makeOwner(),d=await makeOwner();const racing=await Promise.all([c,d].map(headers=>send(headers,{action:'submit',activityId:activity.id,name:'Concurrent camper',details:{gender:'male',tentNumber:'1'},consent:true})));
  assert.deepEqual(racing.map(r=>r.status()).sort(),[200,409]);assert.equal([...rows.values()].filter(r=>r.record.details.tentNumber===1).length,1);
  assert.equal((await api.post(base+'/api/admin/registrations',{data:{action:'receipt',id,decision:'accepted'}})).status(),401);
  const winner=racing.findIndex(r=>r.status()===200),winningData=await racing[winner].json();assert.equal((await send([c,d][winner],{action:'cancel',id:winningData.recordId})).status(),200);assert.equal(rows.get(winningData.recordId).record.auditLog.at(-1).action,'cancelled');
  for(let i=0;i<60;i++){const example=structuredClone(rows.get(id));example.record.id='bulk-'+i;example.record.reference='BULK-'+i;example.record.details.arabicFullName='مشارك إضافي '+i;rows.set(example.record.id,example);}
  await adminPage.reload();await adminPage.getByRole('button',{name:'طلبات التسجيل',exact:true}).click();await adminPage.getByTestId('registration-row-bulk-0').waitFor();
  assert.equal(await adminPage.locator('tbody tr').count(),25);await adminPage.getByRole('button',{name:'التالي',exact:true}).click();await adminPage.getByTestId('registration-row-bulk-22').waitFor();assert.ok(await adminPage.locator('tbody tr').count()<=25);
  await adminPage.getByLabel('بحث',{exact:false}).fill('مشارك إضافي 59');await adminPage.getByTestId('registration-row-bulk-59').waitFor();assert.equal(await adminPage.locator('tbody tr').count(),1);
  console.log('PASS: large registration index stays paginated at 25 rows and supports name search');
  console.log('PASS: real Next APIs + mocked Supabase RPC contract: ownership isolation, private receipt dashboard, rejection/re-upload, approval-only instructions, concurrent tent allocation, admin authorization; conflicts retried:',conflicts);
  await admin.dispose();
 }catch(e){console.error(log);if(debugPage)console.error((await debugPage.locator('body').innerText()).slice(-6000));console.error([...rows.values()].map(r=>({id:r.record.id,status:r.record.status,receiptStatus:r.record.receiptStatus})));throw e;}finally{if(browser)await browser.close();await api.dispose();server.kill('SIGTERM');db.close();}
})().catch(e=>{console.error(e);process.exit(1)});
