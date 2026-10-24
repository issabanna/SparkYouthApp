const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {defaultContent,normalizeContent,storageKey,registrationKey,tentOccupancy}=require('../packages/shared');
const base=process.env.SPARK_TEST_URL||'http://localhost:3048';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const content=normalizeContent({...defaultContent,registrationTestMode:true,activities:defaultContent.activities.filter(a=>a.id==='camp-demo').map(a=>({...a,tentsEnabled:true,registrationMode:'standard'}))});
 await c.addInitScript(({key,content})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(content))},{key:storageKey,content});
 await p.goto(base);await p.getByRole('button',{name:'المخيمات والأنشطة',exact:true}).click();await p.getByRole('button',{name:'تعديل',exact:true}).click();
 const enabled=p.getByLabel('تفعيل قائمة الانتظار وإخفاء جميع الخيام',{exact:true});assert.equal(await enabled.isChecked(),false);await enabled.check();assert.equal(await p.getByLabel('وضع التسجيل',{exact:true}).inputValue(),'waitingList');await p.getByRole('button',{name:'حفظ المحتوى',exact:true}).click();
 await p.goto(base+'/app');await p.getByLabel('اسمك في المعاينة').fill('فحص قائمة الانتظار');await p.getByRole('button',{name:'دخول تجريبي'}).click();await p.getByRole('tab',{name:'الأنشطة',exact:true}).click();await p.getByRole('button',{name:'سجّل في قائمة الانتظار',exact:true}).click();await p.getByRole('checkbox',{name:'قرأت التعليمات وأوافق عليها'}).click();await p.getByRole('button',{name:'بدء التسجيل',exact:true}).click();await p.getByRole('button',{name:'ذكر',exact:true}).click();await p.getByRole('button',{name:'التالي: ولي الأمر والمعلومات الأخرى'}).click();await p.getByRole('button',{name:'التالي: قائمة الانتظار'}).click();
 await p.getByText('لا توجد خيام متاحة للتسجيل حاليًا.',{exact:false}).waitFor();
 assert.equal(await p.getByRole('button',{name:/^الخيمة \d+$/}).count(),0);await p.getByRole('button',{name:'قائمة الانتظار',exact:true}).click();await p.getByRole('button',{name:'التالي: مراجعة الطلب'}).click();await p.getByRole('checkbox',{name:'أوافق على تعليمات المشاركة'}).click();await p.getByRole('button',{name:'إرسال طلب التسجيل'}).click();await p.getByRole('button',{name:'تسجيل مشارك جديد',exact:true}).waitFor();
 const records=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),registrationKey);assert.equal(records.length,1);assert.equal(records[0].status,'Waiting');assert.equal(records[0].details.tentNumber,null);assert.equal(tentOccupancy(content.activities[0],0,records),0);assert.deepEqual(errors,[]);
 console.log('PASS: admin checkbox activates waiting-list mode; hides all numbered tents even with capacity; explains status; creates Waiting record with no assigned tent or occupied place');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
