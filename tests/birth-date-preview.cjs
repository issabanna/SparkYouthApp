const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {defaultContent,normalizeContent,storageKey,ageAt}=require('../packages/shared');
const base=process.env.SPARK_TEST_URL||'http://localhost:3042';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const content=normalizeContent({...defaultContent,schemaVersion:5,activities:defaultContent.activities.map(a=>a.id==='camp-demo'?{...a,dobMin:'2008-01-01',dobMax:'2012-12-31',startDate:'',date:'',collectCity:false,collectSchool:false,collectShirtSize:false,startInstructions:'تعليمات البداية المعتمدة',instructions:'تعليمات عامة ملغاة',terms:'شروط قديمة ملغاة'}:a)});
  await c.addInitScript(({key,content})=>{if(!localStorage.getItem('seeded-date-test')){localStorage.setItem(key,JSON.stringify(content));localStorage.setItem('seeded-date-test','1')}},{key:storageKey,content});
  await p.goto(base+'/app');await p.getByLabel('اسمك في المعاينة').fill('فحص الميلاد');await p.getByRole('button',{name:'دخول تجريبي'}).click();
  await p.getByRole('tab',{name:'الأنشطة',exact:true}).click();await p.getByRole('button',{name:'مخيمات',exact:true}).click();await p.getByRole('button',{name:'سجّل الآن',exact:false}).click();
  await p.getByText('تعليمات قبل التسجيل',{exact:true}).waitFor();
  await p.getByText('تعليمات البداية المعتمدة',{exact:true}).waitFor();
  assert.equal(await p.getByText('تعليمات عامة ملغاة',{exact:true}).count(),0);
  assert.equal(await p.getByText('وضع تجربة التسجيل:',{exact:false}).count(),0);
  await p.getByRole('checkbox',{name:'قرأت التعليمات وأوافق عليها'}).click();await p.getByRole('button',{name:'بدء التسجيل',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'آخر',exact:true}).count(),0);
  await p.getByRole('button',{name:'اختيار تاريخ الميلاد',exact:true}).click();
  assert.equal(await p.getByLabel('سنة الميلاد').inputValue(),'2008');assert.equal(await p.getByLabel('شهر الميلاد').inputValue(),'1');
  await p.getByRole('button',{name:'2008-01-01',exact:true}).click();
  await p.getByText(`العمر: ${ageAt('2008-01-01',new Date().toISOString().slice(0,10))} سنة`,{exact:true}).waitFor();
  await p.getByRole('button',{name:'ذكر',exact:true}).click();await p.getByRole('button',{name:'التالي: ولي الأمر والمعلومات الأخرى'}).click();for(const label of ['المدينة','المدرسة','مقاس التيشيرت'])assert.equal(await p.getByLabel(label,{exact:true}).count(),0);await p.getByRole('button',{name:'التالي: اختيار الخيمة'}).click();
  assert.equal(await p.getByText('خدمات اختيارية',{exact:true}).count(),0);assert.equal(await p.getByRole('checkbox',{name:'أحتاج وجبات'}).count(),0);
  const admin=await c.newPage();await admin.goto(base);await admin.getByRole('button',{name:'المخيمات والأنشطة',exact:true}).click();
  await admin.getByRole('button',{name:'تعديل'}).first().click();
  for(const label of ['تاريخ البداية','تاريخ النهاية','وقت المغادرة','وقت الوصول','وصف الصفوف على البطاقة','وصف مواليد المخيم','الصفوف المؤهلة','يوم الزيارة','تطبيق حدود العمر إضافةً إلى شروط الصف والميلاد','تعليمات التسجيل','تعليمات المشاركة'])assert.equal(await admin.getByLabel(label,{exact:true}).count(),0);
  for(const label of ['تعليمات قبل التسجيل','تعليمات بعد التسجيل'])assert.equal(await admin.getByLabel(label,{exact:true}).count(),1);
  for(const label of ['السؤال عن المدينة','السؤال عن المدرسة','السؤال عن مقاس التيشيرت'])assert.equal(await admin.getByLabel(label,{exact:true}).count(),1);
  for(const label of ['خيارات المدن','خيارات المدارس','مقاسات التيشيرت'])assert.equal(await admin.getByLabel(label,{exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: DOB calendar opens at minimum year, selects birthday, calculates age, two gender choices, no optional services, removed admin timing fields');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
