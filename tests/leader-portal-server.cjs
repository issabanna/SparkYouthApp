const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {request,chromium}=require('playwright');
const shared=require('../packages/shared');
const leaders=require('../packages/shared/leaders');
const root=path.resolve(__dirname,'..'),base='http://localhost:3060',password='test-only-leader-admin-password';
const contentBase=shared.normalizeContent({...shared.defaultContent,activities:[{id:'camp-one',title:'مخيم الاختبار',kind:'camp',published:true,leaderAbout:'وصف خاص للمرشدين',leaderLinks:[{title:'تقييم المخيم',url:'https://example.com/event'}],leaderTeamImage:'/media/team.png'},{id:'camp-two',title:'مخيم آخر',kind:'camp',published:true}],leaderSettings:{generalLinks:[{title:'دليل المرشد',url:'https://example.com/guide'}]}});
let content=contentBase;const rows=new Map(),versions=new Map(),photos=new Map();let conflicts=0,forceConflict=true;
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
 await new Promise(resolve=>db.listen(3059,'127.0.0.1',resolve));
 const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3060'],{cwd:path.join(root,'apps/admin'),env:{...process.env,SUPABASE_URL:'http://127.0.0.1:3059',SUPABASE_SERVICE_ROLE_KEY:'test-service-role-only',ADMIN_PASSWORD:password,OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 const api=await request.newContext();let browser,page;
 try{
  for(let i=0;i<100;i++){try{if((await api.get(base+'/api/account')).status()===401)break}catch{}await new Promise(r=>setTimeout(r,100))}
  const json=async(response,status=200)=>{assert.equal(response.status(),status,await response.text());return response.json()};
  const post=(route,headers,data)=>api.post(base+route,{headers,data});
  const makeOwner=async()=>({Authorization:'Bearer '+(await json(await api.post(base+'/api/registrations/session'))).token});
  const admin=await request.newContext();await json(await admin.post(base+'/api/admin/session',{data:{password}}));
  const expected=r=>JSON.stringify({status:r.status,assignments:r.assignments||[],busActivities:r.busActivities||[]});
  const adminAction=async(record,body)=> (await json(await admin.post(base+'/api/admin/leaders',{data:{id:record.id,expected:expected(record),...body}}))).application;
  const details={englishFirstName:'Test',englishFatherName:'Parent',englishLastName:'Family',phone:'0790000000',nationalId:'TEST-12345',city:'عمّان',gender:'male',dob:'1997-01-01'};
  const extra={maritalStatus:leaders.leaderChoices.maritalStatus[0],education:leaders.leaderChoices.education[0],employmentStatus:leaders.leaderChoices.employmentStatus[0],workplace:'Test only',church:'Test church',previousCamp:'نعم'};
  const outsider=await makeOwner();assert.equal((await post('/api/leaders',outsider,{details:extra,consent:true})).status(),400);
  const people={};
  const makeLeader=async(name,roleId,teamGroup='alpha',tentNumber=null)=>{
   const owner=await makeOwner();const account=(await json(await post('/api/account',owner,{details:{...details,englishFirstName:name}}))).account;
   const submission=await json(await post('/api/leaders',owner,{details:{...extra,englishFirstName:'FORGED',roleId:'manager'},consent:true,status:'LeaderApproved'}));
   assert.equal(submission.application.status,'LeaderPending');assert.equal(submission.application.details.englishFirstName,name);assert.equal(submission.portal,null);
   let record=await adminAction(submission.application,{action:'status',status:'LeaderApproved'});
   record=await adminAction(record,{action:'assign',assignments:[{activityId:'camp-one',roleId,teamGroup,tentNumber}]});
   people[name]={owner,record,account};return people[name];
  };
  const manager=await makeLeader('Manager','manager'),head=await makeLeader('SupportHead','supportTeamHead'),support=await makeLeader('Support','supportTeam'),otherSupport=await makeLeader('OtherSupport','supportTeam','beta'),teamHead=await makeLeader('TeamHead','teamHead'),leader=await makeLeader('Leader','leader','alpha',2),otherLeader=await makeLeader('OtherLeader','leader','beta',3),office=await makeLeader('Office','office');
  const publicData=await json(await api.get(base+'/api/content'));assert.ok(!JSON.stringify(publicData).includes('وصف خاص للمرشدين'));assert.ok(!JSON.stringify(publicData).includes('https://example.com'));
  const own=await json(await api.get(base+'/api/leaders',{headers:head.owner}));assert.deepEqual(own.portal.activities[0].evaluationSections,['support']);assert.equal(own.portal.activities[0].team.length,8);assert.equal(own.portal.links.length,1);assert.equal(own.portal.activities.length,1);
  assert.equal((await post('/api/leaders',head.owner,{details:extra,consent:true})).status(),400);
  const evalGet=async(person,section,status=200)=>json(await api.get(base+'/api/leader-evaluations?activity=camp-one&section='+section,{headers:person.owner}),status);
  assert.deepEqual((await evalGet(head,'support')).subjects.map(s=>s.id),[support.record.id]);
  assert.deepEqual((await evalGet(teamHead,'team')).subjects.map(s=>s.id),[leader.record.id]);
  assert.equal((await evalGet(manager,'support')).subjects.length,2);await evalGet(office,'support',403);await evalGet(head,'team',403);
  assert.equal((await api.get(base+'/api/leader-evaluations?activity=camp-two&section=support',{headers:manager.owner})).status(),403);
  const camper=(id,tent,status='Confirmed')=>({id,activityId:'camp-one',status,details:{nationalId:'CAMP-'+id,arabicFullName:'Camper '+id,tentNumber:tent,gender:'male'},receiptStatus:'accepted',auditLog:[]});
  for(const r of [camper('approved',2),camper('unpaid',2,'Pending'),camper('other-tent',3),camper('cancelled',2,'Cancelled')])rows.set(r.id,{owner_hash:'a'.repeat(64),record:r});
  assert.deepEqual((await evalGet(leader,'campers')).subjects.map(s=>s.id),['approved','unpaid']);assert.equal((await evalGet(manager,'campers')).subjects.length,3);
  const answers=Object.fromEntries(leaders.evaluationQuestions.support.map(([id])=>[id,leaders.evaluationChoices[0]]));
  const saveEvaluation=(person,subjectId,patch={})=>post('/api/leader-evaluations',person.owner,{activityId:'camp-one',section:'support',subjectId,answers,notes:'Test-only note',expected:null,...patch});
  assert.equal((await saveEvaluation(head,otherSupport.record.id)).status(),409);
  assert.equal((await saveEvaluation(office,support.record.id)).status(),409);
  assert.equal((await saveEvaluation(head,support.record.id,{answers:{...answers,forged:'extra'}})).status(),409);
  const saved=await json(await saveEvaluation(head,support.record.id));assert.equal(saved.evaluation.notes,'Test-only note');
  assert.equal((await saveEvaluation(head,support.record.id)).status(),409);
  await json(await saveEvaluation(head,support.record.id,{expected:saved.evaluation.updatedAt,notes:'Updated'}));
  assert.equal((await evalGet(manager,'support')).subjects.find(s=>s.id===support.record.id).evaluation,null);
  const camperAnswers=Object.fromEntries(leaders.evaluationQuestions.campers.map(q=>[q[0],leaders.choicesForQuestion(q)[0]]));
  const camperSave=(subjectId,answers)=>post('/api/leader-evaluations',leader.owner,{activityId:'camp-one',section:'campers',subjectId,answers,notes:'Camper note',expected:null});
  assert.equal((await camperSave('other-tent',{...camperAnswers,churchName:'Test church'})).status(),409);
  assert.equal((await camperSave('approved',camperAnswers)).status(),409);
  await json(await camperSave('approved',{...camperAnswers,churchName:'Test church'}));
  assert.equal((await evalGet(otherLeader,'campers')).subjects[0].evaluation,null);
  const person=await json(await api.get(base+'/api/leader-person?activity=camp-one&section=support&id='+support.record.id,{headers:head.owner}));assert.equal(person.person.role,'Support Team');assert.equal(person.person.phone,'0790000000');assert.equal(person.person.history.length,1);assert.ok(!JSON.stringify(person).includes('TEST-12345'));
  assert.equal((await api.get(base+'/api/leader-person?activity=camp-one&section=support&id='+otherSupport.record.id,{headers:head.owner})).status(),403);
  const ownerRegistrations=await json(await api.get(base+'/api/registrations',{headers:head.owner}));assert.equal(ownerRegistrations.records.length,0);assert.ok(!JSON.stringify(ownerRegistrations).includes('Test-only note'));
  const index=await json(await admin.get(base+'/api/admin/registrations?compact=true'));assert.equal(index.total,4);
  assert.equal((await api.get(base+'/api/bus?activity=camp-one',{headers:head.owner})).status(),403);
  head.account=(await json(await admin.post(base+'/api/admin/accounts',{data:{id:head.account.id,expected:JSON.stringify(head.account.busActivities||[]),busActivities:['camp-one']}}))).account;
  assert.equal((await json(await api.get(base+'/api/leaders',{headers:head.owner}))).busActivities.length,1);
  const totals=await json(await api.get(base+'/api/bus?activity=camp-one',{headers:head.owner}));assert.deepEqual(totals.totals,{registered:3,boarded:0,pending:3});
  assert.equal((await api.get(base+'/api/bus?activity=camp-two',{headers:head.owner})).status(),403);
  const scan=async(id,activity='camp-one')=>post('/api/bus',head.owner,{action:'scan',activityId:'camp-one',code:JSON.stringify({type:'spark-registration',activity,registration:id})});
  assert.equal((await scan('approved','camp-two')).status(),409);assert.equal((await json(await scan('unpaid'))).camper.canBoard,false);
  assert.equal((await post('/api/bus',head.owner,{action:'board',activityId:'camp-one',id:'unpaid'})).status(),409);
  assert.equal((await json(await scan('approved'))).camper.name,'Camper approved');
  for(let i=0;i<2;i++){const boarded=await json(await post('/api/bus',head.owner,{action:'board',activityId:'camp-one',id:'approved'}));assert.deepEqual(boarded.totals,{registered:3,boarded:1,pending:2})}
  assert.equal(rows.get('approved').record.auditLog.filter(e=>e.action==='bus_boarded').length,1);
  head.account=(await json(await admin.post(base+'/api/admin/accounts',{data:{id:head.account.id,expected:JSON.stringify(head.account.busActivities||[]),busActivities:[]}}))).account;assert.equal((await scan('approved')).status(),403);
  assert.equal((await json(await api.get(base+'/api/leaders',{headers:outsider}))).application,null);
  const reports=await json(await admin.get(base+'/api/admin/evaluations?nationalId=CAMP-approved'));assert.equal(reports.total,1);assert.equal(reports.records[0].subjectSnapshot.nationalId,'CAMPAPPROVED');assert.equal(reports.records[0].campId,'camp-one');assert.ok(reports.records[0].campYear);assert.equal((await api.get(base+'/api/admin/evaluations')).status(),401);assert.ok(!JSON.stringify(await evalGet(leader,'campers')).includes('CAMPAPPROVED'));
  console.log('PASS server ownership, admin-only approval/assignment, per-camp role/tent/team isolation, private audited evaluations, bus permissions, approved-only and idempotent boarding.');
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({token,account})=>{localStorage.setItem('spark-registration-session-v1',token);localStorage.setItem('spark-camp-profile-v1',JSON.stringify({user:{name:'SupportHead',role:'camper'},account,completed:[],reflections:{}}))},{token:head.owner.Authorization.slice(7),account:head.account});page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/app');await page.getByRole('tab',{name:'حسابي',exact:true}).click();await page.getByRole('button',{name:'بوابة المرشدين',exact:true}).waitFor();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'تغيير صورة الملف الشخصي',exact:true}).click();await (await chooser).setFiles(path.join(root,'apps/admin/public/media/camp.png'));await page.getByText('تم تحديث صورة الحساب.',{exact:true}).waitFor();
  const photoAccount=(await json(await api.get(base+'/api/account',{headers:head.owner}))).account;assert.ok(photoAccount.photo.startsWith('data:image/jpeg;base64,'));assert.ok(Buffer.from(photoAccount.photo.split(',')[1],'base64').length<=500000);
  await page.reload();await page.getByRole('tab',{name:'حسابي',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="تغيير صورة الملف الشخصي"] img')?.getAttribute('src')?.startsWith('data:image/jpeg;base64,'));
  const invalidChooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'تعديل صورة الحساب',exact:true}).click();await (await invalidChooser).setFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await page.getByText('تعذّر فتح الصورة. جرّب JPEG أو PNG.',{exact:true}).waitFor();assert.equal((await json(await api.get(base+'/api/account',{headers:head.owner}))).account.photo,photoAccount.photo);
  console.log('PASS profile avatar/button upload, automatic compression, saved preview after reload, invalid image retains previous picture.');
  await page.getByRole('button',{name:'بوابة المرشدين',exact:true}).click();
  await page.getByText('مخيم الاختبار',{exact:true}).click();await page.getByRole('button',{name:'فريق المخيم',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'تقييم فريق المرشدين',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'تقييم المخيمين',exact:true}).count(),0);await page.getByRole('button',{name:'تقييم فريق الدعم',exact:true}).click();await page.getByRole('button',{name:'Support Parent Family · تم التقييم'}).click();await page.getByRole('button',{name:'التقييم والملاحظات',exact:true}).click();await page.getByLabel('الملاحظات والتوصيات',{exact:true}).fill('Saved in browser');await page.getByRole('button',{name:'حفظ التقييم',exact:true}).click();await page.getByText('تم حفظ التقييم.',{exact:true}).waitFor();assert.deepEqual(errors,[]);
  // A new applicant sees the basic details as text, not duplicate inputs.
  const restored=await browser.newContext({viewport:{width:390,height:844}});await restored.addInitScript(token=>localStorage.setItem('spark-registration-session-v1',token),office.owner.Authorization.slice(7));const restoredPage=await restored.newPage();await restoredPage.goto(base+'/app');await restoredPage.waitForFunction(()=>document.querySelector('input[aria-label="الاسم الأول بالإنجليزية"]')?.value==='Office');await restoredPage.getByRole('button',{name:'حفظ ومتابعة',exact:true}).click();await restoredPage.getByRole('tab',{name:'حسابي',exact:true}).waitFor();
  const applicant=await makeOwner();await json(await post('/api/account',applicant,{details:{...details,englishFirstName:'Applicant'}}));
  const context2=await browser.newContext({viewport:{width:390,height:844}});await context2.addInitScript(token=>{localStorage.setItem('spark-registration-session-v1',token);localStorage.setItem('spark-camp-profile-v1',JSON.stringify({user:{name:'Applicant',role:'approvedLeader'},completed:[],reflections:{}}))},applicant.Authorization.slice(7));const page2=await context2.newPage();await page2.goto(base+'/app');await page2.getByRole('tab',{name:'حسابي',exact:true}).click();assert.equal(await page2.getByRole('button',{name:'Bus App',exact:true}).count(),0);await page2.getByRole('button',{name:'التسجيل كمرشد',exact:true}).click();await page2.getByText('Applicant',{exact:true}).last().waitFor();assert.equal(await page2.getByRole('textbox',{name:'الاسم الأول بالإنجليزية',exact:true}).count(),0);await page2.getByLabel('الحالة الاجتماعية',{exact:true}).selectOption(leaders.leaderChoices.maritalStatus[0]);await page2.getByLabel('التعليم',{exact:true}).selectOption(leaders.leaderChoices.education[0]);await page2.getByLabel('حالة العمل',{exact:true}).selectOption(leaders.leaderChoices.employmentStatus[0]);await page2.getByLabel('مكان العمل أو الدراسة',{exact:true}).fill('Test');await page2.getByLabel('اسم الكنيسة',{exact:true}).fill('Test');await page2.getByLabel('هل كنت في مخيم جلعاد من قبل؟',{exact:true}).selectOption('نعم');await page2.getByRole('checkbox').click();await page2.getByRole('button',{name:'إرسال طلب الإرشاد',exact:true}).click();await page2.getByRole('button',{name:'طلب الإرشاد بانتظار الموافقة',exact:true}).waitFor();
  const adminContext=await browser.newContext({storageState:await admin.storageState()}),adminPage=await adminContext.newPage();await adminPage.goto(base);await adminPage.getByRole('button',{name:'طلبات المرشدين والتكليفات',exact:true}).click();await adminPage.getByRole('button',{name:'Applicant Parent Family',exact:true}).click();await adminPage.getByRole('button',{name:'اعتماد المرشد',exact:true}).click();await adminPage.getByRole('button',{name:'حفظ تكليفات المرشد',exact:true}).waitFor();
  await page2.reload();await page2.getByRole('tab',{name:'حسابي',exact:true}).click();await page2.getByRole('button',{name:'بوابة المرشدين',exact:true}).waitFor();
  // Mock the browser camera/detector, while retaining real server QR authorization/boarding.
  manager.account=(await json(await admin.post(base+'/api/admin/accounts',{data:{id:manager.account.id,expected:'[]',busActivities:['camp-one']}}))).account;
  const busContext=await browser.newContext({viewport:{width:390,height:844}});await busContext.addInitScript(token=>{localStorage.setItem('spark-registration-session-v1',token);localStorage.setItem('spark-camp-profile-v1',JSON.stringify({user:{name:'Manager',role:'camper'},completed:[],reflections:{}}));window.BarcodeDetector=class{async detect(){return [{rawValue:JSON.stringify({type:'spark-registration',activity:'camp-one',registration:'other-tent'})}]}};Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>new MediaStream()},configurable:true});HTMLMediaElement.prototype.play=async function(){}},manager.owner.Authorization.slice(7));const busPage=await busContext.newPage();await busPage.goto(base+'/app');await busPage.getByRole('tab',{name:'حسابي',exact:true}).click();await busPage.getByRole('button',{name:'Bus App',exact:true}).click();await busPage.getByRole('button',{name:'مخيم الاختبار',exact:true}).click();await busPage.getByRole('button',{name:'مسح QR',exact:true}).click();await busPage.getByText('Camper other-tent',{exact:true}).waitFor();await busPage.getByRole('button',{name:'تسجيل الصعود للحافلة',exact:true}).click();await busPage.getByRole('button',{name:'تم الصعود',exact:true}).waitFor();assert.equal(rows.get('other-tent').record.busBoarding.actor.type,'busAdmin');
  // A reused camp in a later year retains the older evaluation instead of overwriting it.
  content={...content,activities:content.activities.map(a=>a.id==='camp-one'?{...a,date:'2027-07-01'}:a)};
  assert.equal((await evalGet(head,'support')).subjects.find(s=>s.id===support.record.id).evaluation,null);
  await json(await saveEvaluation(head,support.record.id));
  const yearly=await json(await admin.get(base+'/api/admin/evaluations?nationalId=TEST-12345'));assert.deepEqual(yearly.years,[2027,2026]);assert.equal(yearly.total,2);
  console.log('PASS browser QR scanner→authorized check-in and year-preserved national-ID report history.');
  console.log('PASS browser account menu, saved-detail preview, additional leader form, pending → admin approval → portal, scoped role buttons and evaluation save.');
 }catch(e){console.error(log);if(page)console.error((await page.locator('body').innerText()).slice(-5000));throw e}finally{if(browser)await browser.close();await api.dispose();server.kill('SIGTERM');db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
