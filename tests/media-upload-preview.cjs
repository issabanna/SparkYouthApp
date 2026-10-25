const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.SPARK_TEST_URL||'http://localhost:3031';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const c=await b.newContext({viewport:{width:1100,height:900}}),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  assert.equal((await c.request.get(base+'/api/admin/content')).status(),401);
  assert.equal((await c.request.post(base+'/api/media',{data:'unauthorized'})).status(),401);
  assert.equal((await c.request.get(base+'/api/media/content.json')).status(),404);
  await p.goto(base);
  const image=path.join(__dirname,'../apps/admin/public/media/team.png');
  for(const [section,label,key]of [['إعلانات الصفحة الرئيسية','رفع صورة الإعلان','announcements'],['مسارات التعلّم','رفع صورة المسار','journeys'],['ألبومات الصور','رفع صور الألبوم','galleries']]){
   await p.getByRole('button',{name:section,exact:true}).click();
   await p.locator('article').first().getByRole('button',{name:'تعديل',exact:true}).click();
   await p.getByLabel(label,{exact:false}).setInputFiles(key==='galleries'?[image,image]:image);
   await p.getByText('تم رفع الصورة بنجاح.',{exact:false}).first().waitFor();
   if(key==='galleries')await p.getByRole('button',{name:'حذف الصورة 5',exact:true}).click();
   await p.getByRole('button',{name:'حفظ المحتوى',exact:true}).click();
   const data=await p.evaluate(()=>JSON.parse(localStorage.getItem('spark-camp-content-v1')));
   const src=key==='galleries'?data[key][0].images.at(-1):data[key][0].image;
   assert(src.startsWith('data:image/jpeg;base64,'));
  }
  await p.setViewportSize({width:390,height:844});await p.goto(base+'/app');
  await p.getByLabel('اسمك في المعاينة').fill('اختبار الصور');await p.getByRole('button',{name:'دخول تجريبي'}).click();
  await p.getByText('مغامرتنا تجمعنا',{exact:true}).waitFor();
  const photos=p.locator('img[src^="data:image/jpeg"]');await photos.first().waitFor();
  await p.waitForFunction(()=>Array.from(document.querySelectorAll('img[src^="data:image/jpeg"]')).some(x=>x.complete&&x.naturalWidth>0));
  assert.deepEqual(errors,[]);
  console.log('PASS: announcement/learning uploads, multiple gallery uploads and removal, saved uploads render in app preview; anonymous cloud writes and private-key access denied.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
