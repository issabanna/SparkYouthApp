const auth=require('./auth-fixtures.cjs').createAuthFixture();
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {request,chromium}=require('playwright');
const shared=require('../packages/shared');
const leaders=require('../packages/shared/leaders');
const root=path.resolve(__dirname,'..'),base='http://localhost:3074',password='test-only-leader-admin-password';
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
 else if(url.pathname==='/rest/v1/spark_registrations'){
 result=[...rows.values()];
 const id=url.searchParams.get('id'),activity=url.searchParams.get('activity_id'),owner=url.searchParams.get('owner_hash'),contains=url.searchParams.get('record');
 if(id)result=result.filter(r=>r.record.id===id.slice(3));
 if(activity)result=result.filter(r=>r.record.activityId===activity.slice(3));
 if(owner)result=result.filter(r=>r.owner_hash===owner.slice(3));
 if(contains){const filter=JSON.parse(contains.slice(3)); result=result.filter(r=>r.record.recordType===filter.recordType && r.record.notes?.some(n=>Object.entries(filter.notes[0]).every(([k,v])=>n[k]===v)));}
 result=result.map(r=>({owner_hash:r.owner_hash,record:r.record}));
 }
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
 await new Promise(resolve=>db.listen(3073,'127.0.0.1',resolve));
 const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3074'],{cwd:path.join(root,'apps/admin'),env:{...process.env,SUPABASE_URL:'http://127.0.0.1:3073',SUPABASE_SERVICE_ROLE_KEY:'test-service-role-only',ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});
 let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 const api=await request.newContext();let browser,page;
 const json=async(response,status=200)=>{assert.equal(response.status(),status,await response.text());return response.json()};
 try{
  for(let i=0;i<100;i++){try{if((await api.get(base+'/api/auth')).status()===200)break}catch{}await new Promise(r=>setTimeout(r,100))}
  const create=async email=>(await json(await api.post(base+'/api/auth',{data:{action:'signup',email,password:'Fixture-password-123'}}))).session;
  const first=await create('bible-first@example.test'),second=await create('bible-second@example.test');
  const headers=s=>({Authorization:'Bearer '+s.access_token});
  const get=s=>api.get(base+'/api/bible',{headers:headers(s)});
  const save=(s,data)=>api.post(base+'/api/bible',{headers:headers(s),data});
  const feed=s=>api.get(base+'/api/bible?view=shared&translation=ar-svd&book=43&chapter=1',{headers:headers(s)});
  await json(await api.get(base+'/api/bible'),401); await json(await feed({access_token:'bad'}),401);
  await json(await api.post(base+'/api/bible',{headers:{...headers(first),Origin:'https://foreign.test'},data:{action:'progress'}}),401);
  const account={details:{englishFirstName:'Bible',englishFatherName:'Test',englishLastName:'Reader',gender:'male'}};
  await json(await api.post(base+'/api/account',{headers:headers(first),data:account}));
  let lib=await json(await get(first));assert.equal(lib.revision,0);assert.deepEqual(lib.notes,[]);
  const note={translation:'ar-svd',book:43,chapter:1,verse:1,text:'private-only-sentinel'};
  lib=await json(await save(first,{action:'save',revision:0,note}));assert.equal(lib.notes[0].visibility,'private');assert.equal(lib.revision,1);
  const privateId=lib.notes[0].id;
  assert.deepEqual((await json(await get(second))).notes,[]);assert.deepEqual((await json(await feed(second))).notes,[]);
  await json(await save(second,{action:'save',revision:0,id:privateId,note}),404);
  await json(await save(first,{action:'save',revision:0,note}),409);
  lib=await json(await save(first,{action:'save',revision:1,note:{...note,text:'shared-reflection',visibility:'shared'}}));
  const sharedId=lib.notes[0].id;
  const shared=await json(await feed(second));assert.equal(shared.notes.length,1);assert.equal(shared.notes[0].author,'Bible Reader');assert.equal(shared.notes[0].mine,false);
  assert.ok(!JSON.stringify(shared).includes('private-only-sentinel'));assert.ok(!JSON.stringify(shared).includes('owner_hash'));assert.ok(!JSON.stringify(shared).includes('bible-first@example.test'));
  assert.equal((await json(await feed(first))).notes[0].mine,true);
  lib=await json(await save(first,{action:'save',revision:2,id:sharedId,note:{...note,text:'now-private',visibility:'private'}}));
  assert.deepEqual((await json(await feed(second))).notes,[]);
  const moved=await json(await save(first,{action:'progress',reference:{translation:'en-asv',book:66,chapter:22},fontSize:27}));
  assert.equal(moved.revision,3);assert.equal(moved.progress.book,66);assert.equal(moved.fontSize,27);assert.equal(moved.notes.length,2);
  const otherDevice=(await json(await api.post(base+'/api/auth',{data:{action:'login',email:'bible-first@example.test',password:'Fixture-password-123'}}))).session;
  assert.equal((await json(await get(otherDevice))).notes.length,2);
  lib=await json(await save(first,{action:'delete',revision:3,id:sharedId}));assert.equal(lib.notes.length,1);
  await json(await save(first,{action:'save',revision:4,note:{...note,verse:999}}),400);
  const verse={translation:'ar-svd',book:43,chapter:1,verse:1};
  lib=await json(await save(first,{action:'highlight',revision:4,reference:verse}));assert.equal(lib.highlights.length,1);assert.equal(lib.revision,5);assert.equal(lib.notes[0].text,'private-only-sentinel');assert.equal(lib.progress.book,66);
  assert.deepEqual((await json(await get(second))).highlights,[]);
  lib=await json(await save(first,{action:'highlight',revision:5,reference:verse}));assert.equal(lib.highlights.length,1,'Repeated highlight does not duplicate a verse');
  await json(await save(first,{action:'highlight',revision:5,reference:verse,remove:true}),409);
  assert.ok(!JSON.stringify(await json(await feed(second))).includes('highlights'));
  lib=await json(await save(first,{action:'highlight',revision:6,reference:verse,remove:true}));assert.deepEqual(lib.highlights,[]);
  await json(await save(first,{action:'highlight',revision:7,reference:{...verse,verse:999}}),400);
  await json(await save(first,{action:'highlight',revision:7,reference:verse,remove:'false'}),400);
  // Native and web share these authenticated endpoints; verify web reading and note controls.
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(session=>localStorage.setItem('spark-auth-session-v1',JSON.stringify(session)),first);
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/app');await page.getByRole('tab',{name:'حسابي',exact:true}).click();
  await page.getByRole('button',{name:'كتابي المقدس',exact:true}).click();await page.getByText('كتابي المقدس',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('ترجمة الكتاب المقدس',{exact:true}).count(),0);
  await page.getByRole('button',{name:'إعدادات القراءة',exact:true}).click();
  await page.getByLabel('ترجمة الكتاب المقدس',{exact:true}).selectOption('ar-svd');
  await page.getByLabel('سفر الكتاب المقدس',{exact:true}).selectOption('43');await page.getByLabel('الإصحاح',{exact:true}).selectOption('1');
  await page.getByRole('button',{name:'متابعة القراءة',exact:true}).click();
  await page.getByRole('button',{name:'خيارات الآية يوحنا 1:1',exact:true}).click();
  await page.getByRole('button',{name:'تظليل الآية',exact:true}).waitFor();await page.screenshot({path:'/tmp/spark-bible-verse-actions.png',animations:'disabled'});await page.getByRole('button',{name:'تظليل الآية',exact:true}).click();await page.getByText('تم تظليل الآية لك فقط.',{exact:true}).waitFor();
  assert.equal((await json(await get(first))).highlights.length,1);assert.deepEqual((await json(await get(second))).highlights,[]);
  await page.getByRole('button',{name:'حفظ موضع القراءة',exact:true}).click();await page.getByText('تم حفظ موضع القراءة وحجم الخط لحسابك.',{exact:true}).waitFor();
  await page.reload();await page.getByRole('tab',{name:'الكتاب المقدس',exact:true}).click();
  await page.getByRole('button',{name:'خيارات الآية يوحنا 1:1',exact:true}).click();
  await page.getByRole('button',{name:'إزالة التظليل',exact:true}).waitFor();
  await page.getByRole('button',{name:'كتابة تعليق',exact:true}).click();
  assert.equal(await page.getByRole('switch',{name:'مشاركة الملاحظة مع مستخدمي سبارك'}).isChecked(),false);
  await page.getByLabel('ملاحظتي على الآية').fill('ملاحظة خاصة من اختبار المتصفح');
  await page.getByRole('button',{name:'حفظ الملاحظة',exact:true}).click();await page.getByText('تم حفظ ملاحظتك الخاصة.',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'ملاحظاتي',exact:true}).click();await page.getByText('ملاحظة خاصة من اختبار المتصفح',{exact:true}).waitFor();
  await page.getByRole('button',{name:'تعديل الملاحظة',exact:true}).first().click();
  await page.getByRole('switch',{name:'مشاركة الملاحظة مع مستخدمي سبارك'}).click();
  await page.getByRole('button',{name:'حفظ الملاحظة',exact:true}).click();await page.getByText('تم حفظ الملاحظة ومشاركتها مع مستخدمي سبارك.',{exact:true}).waitFor();
  assert.ok((await json(await feed(second))).notes.some(n=>n.text==='ملاحظة خاصة من اختبار المتصفح'));
  await page.getByRole('button',{name:'تعديل الملاحظة',exact:true}).first().click();
  await page.getByRole('switch',{name:'مشاركة الملاحظة مع مستخدمي سبارك'}).click();
  await page.getByRole('button',{name:'حفظ الملاحظة',exact:true}).click();await page.getByText('تم حفظ ملاحظتك الخاصة.',{exact:true}).waitFor();
  assert.deepEqual((await json(await feed(second))).notes,[]);
  await page.getByRole('tab',{name:'القراءة',exact:true}).click();await page.getByRole('button',{name:'إعدادات القراءة',exact:true}).click();await page.getByLabel('ترجمة الكتاب المقدس',{exact:true}).selectOption('en-asv');await page.screenshot({path:'/tmp/spark-bible-settings-sheet.png',animations:'disabled'});await page.getByRole('button',{name:'متابعة القراءة',exact:true}).click();await page.getByLabel('ترجمة الكتاب المقدس',{exact:true}).waitFor({state:'hidden'});
  await page.getByText('In the beginning was the Word, and the Word was with God, and the Word was God.',{exact:false}).waitFor();
  await page.screenshot({path:'/tmp/spark-bible-reader.png',fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS Bible API real-auth ownership, private default, sharing/unsharing, revision conflicts, mutation isolation, persistence private highlights, settings sheet, verse actions and Arabic/English reader UI');
 }catch(e){console.error(log);if(page)console.error((await page.locator('body').innerText()).slice(-4500));throw e}
 finally{await browser?.close();await api.dispose();server.kill('SIGTERM');db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
