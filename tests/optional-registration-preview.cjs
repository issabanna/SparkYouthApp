const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SPARK_TEST_URL||'http://localhost:3026';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/app');
 await p.getByLabel('اسمك في المعاينة').fill('اختبار سريع');
 await p.getByRole('button',{name:'دخول تجريبي'}).click();
 await p.getByRole('tab',{name:'الأنشطة',exact:true}).click();
 await p.getByRole('button',{name:'مخيمات',exact:true}).click();
 await p.getByRole('button',{name:'سجّل الآن',exact:false}).click();
 async function skipAndSubmit(){
  await p.getByRole('button',{name:'ذكر',exact:true}).click();
  await p.getByRole('button',{name:'التالي: ولي الأمر والمعلومات الأخرى'}).click();
  await p.getByRole('button',{name:'التالي: الخيمة والخدمات'}).click();
  await p.getByRole('button',{name:'التالي: مراجعة الطلب'}).click();
  await p.getByText('اختر رقم الخيمة.',{exact:true}).waitFor();
  await p.getByRole('button',{name:'الخيمة 0',exact:true}).click();
  await p.getByRole('button',{name:'التالي: مراجعة الطلب'}).click();
  await p.getByRole('checkbox',{name:'أوافق على تعليمات المشاركة'}).click();
  await p.getByRole('button',{name:'إرسال طلب التسجيل'}).click();
  await p.getByRole('button',{name:'تسجيل مشارك جديد',exact:true}).waitFor();
 }
 await skipAndSubmit();
 await p.getByRole('button',{name:'تسجيل مشارك جديد',exact:true}).click();
 await skipAndSubmit();
 const records=await p.evaluate(()=>JSON.parse(localStorage.getItem('spark-event-registrations-v1')));
 assert.equal(records.length,2);
 assert.notEqual(records[0].details.arabicFullName,records[1].details.arabicFullName);
 assert(records.every(r=>r.testRegistration&&r.details.tentNumber===0&&!r.details.idDocument&&!r.details.dob));
 const admin=await c.newPage();await admin.goto(base);
 await admin.getByLabel('وضع تجربة التسجيل — جعل بيانات المشاركين اختيارية').uncheck();
 await p.reload();
 await p.getByRole('tab',{name:'الأنشطة',exact:true}).click();
 await p.getByRole('button',{name:'مخيمات',exact:true}).click();
 await p.getByRole('button',{name:'سجّل مشاركًا آخر',exact:false}).click();
 await p.getByRole('button',{name:'ذكر',exact:true}).click();
 await p.getByRole('button',{name:'التالي: ولي الأمر والمعلومات الأخرى'}).click();
 await p.getByText('أدخل الاسم الثلاثي للمشارك.',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: skip all camper and guardian fields, register two distinct test campers without uploads, retain required tent selection and restore strict validation from admin.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
