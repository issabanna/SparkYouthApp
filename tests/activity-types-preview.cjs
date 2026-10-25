const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.SPARK_TEST_URL||'http://localhost:3047';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.getByRole('button',{name:'المخيمات والأنشطة',exact:true}).click();await p.getByRole('button',{name:'+ إضافة محتوى',exact:true}).click();
 const type=p.getByLabel('نوع النشاط',{exact:false});
 assert.ok((await p.locator('form.editor label').first().innerText()).startsWith('نوع النشاط'));

 for(const kind of ['camp','trip','training','conference','hike']){await type.selectOption(kind);assert.equal(await type.inputValue(),kind);assert.equal(await p.getByText('إعدادات المخيم والخيام',{exact:true}).count(),kind==='camp'?1:0);}
 await type.selectOption('training');await p.getByLabel('العنوان',{exact:true}).fill('تدريب تجريبي');await p.getByLabel('الوصف',{exact:true}).fill('تدريب قصير');await p.getByLabel('منشور ويظهر في التطبيق').check();await p.getByRole('button',{name:'حفظ المحتوى',exact:true}).click();
 await p.goto(base+'/app');await p.getByLabel('اسمك في المعاينة').fill('فحص التدريب');await p.getByRole('button',{name:'دخول تجريبي'}).click();await p.getByRole('tab',{name:'الأنشطة',exact:true}).click();await p.getByRole('button',{name:'فعاليات',exact:true}).click();await p.getByText('تدريب تجريبي',{exact:true}).waitFor();for(const name of ['رحلات','تدريب','مؤتمرات','مسارات مشي'])assert.equal(await p.getByRole('button',{name,exact:true}).count(),0);
 const trainingId=await p.evaluate(()=>JSON.parse(localStorage.getItem('spark-camp-content-v1')).activities.find(a=>a.title==='تدريب تجريبي').id);await p.getByTestId('activity-card-'+trainingId).getByRole('button',{name:'سجّل الآن',exact:false}).click();await p.getByRole('checkbox',{name:'قرأت التعليمات وأوافق عليها'}).click();await p.getByRole('button',{name:'بدء التسجيل',exact:true}).click();await p.getByRole('button',{name:'التالي: مراجعة الطلب',exact:true}).click();await p.getByText('راجع طلبك',{exact:true}).waitFor();assert.equal(await p.getByText('اختر خيمتك',{exact:true}).count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: activity type is first setting, all five requested types persist, training filters and registers without camp tent steps');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
