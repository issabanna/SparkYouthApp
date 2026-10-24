// Exercises the browser/app publishing contract with deterministic storage responses.
// Actual Supabase credentials are verified separately on the deployment.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {defaultContent}=require('../packages/shared');
const {publicContent,imageType}=require('../apps/admin/lib/content-service.cjs');
const base=process.env.SPARK_TEST_URL||'http://localhost:3032';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const c=await b.newContext();let stored=structuredClone(defaultContent),image=null,published=false;
 const id='12345678-1234-1234-1234-123456789012.jpeg',imagePath='/api/media/'+id;
 await c.route('**/api/admin/session',r=>r.fulfill({json:{storage:true,configured:true,authenticated:true}}));
 await c.route('**/api/admin/content',r=>{
  if(r.request().method()==='PUT'){stored=r.request().postDataJSON();published=true;return r.fulfill({json:{saved:true}})}
  return r.fulfill({json:stored});
 });
 await c.route('**/api/media',r=>{image=r.request().postDataBuffer();assert.equal(imageType(image),'jpeg');return r.fulfill({json:{image:imagePath}})});
 await c.route('**'+imagePath,r=>r.fulfill({contentType:'image/jpeg',body:image}));
 await c.route('**/api/content',r=>r.fulfill({json:publicContent(stored)}));
 const p=await c.newPage();await p.goto(base);
 await p.getByRole('button',{name:'إعلانات الصفحة الرئيسية',exact:true}).click();
 await p.locator('article').first().getByRole('button',{name:'تعديل',exact:true}).click();
 await p.getByLabel('العنوان',{exact:true}).fill('إعلان اختبار النشر');
 await p.getByLabel('رفع صورة الإعلان',{exact:false}).setInputFiles(path.join(__dirname,'../apps/admin/public/media/team.png'));
 await p.getByText('تم تجهيز الصور.',{exact:false}).waitFor();
 await p.getByRole('button',{name:'حفظ المحتوى',exact:true}).click();
 await p.getByRole('button',{name:'نشر التغييرات للتطبيق',exact:true}).click();
 await p.getByText('تم النشر.',{exact:false}).waitFor();
 assert(published);assert.equal(stored.announcements[0].image,imagePath);
 const cache=await p.evaluate(()=>JSON.parse(localStorage.getItem('spark-camp-content-v1')));
 assert(!cache||!cache.announcements.some(a=>a.title==='إعلان اختبار النشر'),'Private admin drafts must not be cached in browser storage');
 await p.setViewportSize({width:390,height:844});await p.goto(base+'/app');
 await p.getByLabel('اسمك في المعاينة').fill('اختبار النشر');await p.getByRole('button',{name:'دخول تجريبي'}).click();
 await p.getByText('إعلان اختبار النشر',{exact:true}).waitFor();
 await p.waitForFunction(path=>Array.from(document.querySelectorAll('img')).some(i=>i.src.endsWith(path)&&i.complete&&i.naturalWidth>0),imagePath);
 console.log('PASS: shared-store publishing contract uploads JPEG bytes, publishes image references, keeps private drafts out of localStorage and loads published content/image in the app.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
