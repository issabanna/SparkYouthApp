const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {defaultContent,normalizeContent,storageKey}=require('../packages/shared');
const {pickImage}=require('./camp-fixtures.cjs');
const base=process.env.SPARK_TEST_URL||'http://localhost:3046';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const policy of ['warn','reject']){
   const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   const content=normalizeContent({...defaultContent,registrationTestMode:true,activities:defaultContent.activities.filter(a=>a.id==='camp-demo').map(a=>({...a,tentsEnabled:false,idImageCheckPolicy:policy}))});
   await c.addInitScript(({key,content})=>localStorage.setItem(key,JSON.stringify(content)),{key:storageKey,content});
   let accepted=false;
   await p.route('**/api/registration-image-check',async route=>{
    const body=route.request().postDataJSON();assert.equal(body.activityId,'camp-demo');assert.ok(body.image.startsWith('data:image/'));
    await route.fulfill({json:{status:'checked',kind:accepted?'personal_photo':'unclear',accepted,message:accepted?'صورة واضحة للاختبار':'الصورة غير واضحة للاختبار'}});
   });
   await p.goto(base+'/app');await p.getByLabel('اسمك في المعاينة').fill('فحص الصور');await p.getByRole('button',{name:'دخول تجريبي'}).click();
   await p.getByRole('tab',{name:'الأنشطة',exact:true}).click();await p.getByRole('button',{name:'سجّل الآن',exact:false}).click();
   await p.getByRole('checkbox',{name:'قرأت التعليمات وأوافق عليها'}).click();await p.getByRole('button',{name:'بدء التسجيل',exact:true}).click();
   await p.getByRole('button',{name:'التالي: ولي الأمر والمعلومات الأخرى'}).click();
   await pickImage(p,'اختيار صورة الهوية');await p.getByText('الصورة غير واضحة للاختبار',{exact:false}).waitFor();
   await p.getByRole('button',{name:'التالي: مراجعة الطلب',exact:true}).click();
   if(policy==='reject'){
    await p.getByText('اختر صورة هوية أو صورة شخصية واضحة واجتز فحص الصورة قبل المتابعة.',{exact:true}).waitFor();
    assert.equal(await p.getByText('راجع طلبك',{exact:true}).count(),0);
    accepted=true;await pickImage(p,'استبدال صورة الهوية');await p.getByText('صورة واضحة للاختبار',{exact:true}).waitFor();
    await p.getByRole('button',{name:'التالي: مراجعة الطلب',exact:true}).click();
   }
   await p.getByText('راجع طلبك',{exact:true}).waitFor();assert.deepEqual(errors,[]);await c.close();
  }
  console.log('PASS: warning allows registration, rejection blocks unclear upload, replacing it with a clear portrait permits review (mock AI; no paid requests)');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
