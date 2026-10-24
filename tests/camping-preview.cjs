const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {defaultContent,canAccessJourney,completedCount}=require('../packages/shared');
const base=process.env.SPARK_TEST_URL||'http://localhost:3004';
(async()=>{
 const leaderJourney=defaultContent.journeys.find(j=>j.audience==='leaders');
 for(const role of ['camper','pendingLeader'])assert.equal(canAccessJourney(leaderJourney,{role}),false);
 assert.equal(canAccessJourney(leaderJourney,{role:'approvedLeader'}),true);
 assert.equal(completedCount(['j1','j1'],defaultContent.journeys,{role:'camper'}),1);
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/app');await page.getByText('كل مخيم بداية حكاية',{exact:true}).waitFor();
 assert.equal(await page.getByRole('tab').count(),0,'Home content requires demo sign-in');
 await page.getByLabel('اسمك في المعاينة').fill('مشارك تجريبي');await page.getByRole('button',{name:'دخول تجريبي'}).click();
 await page.getByText('مغامرتنا تجمعنا',{exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);for(const t of await page.getByRole('tab').all()){assert.equal(await t.locator('[style*="ionicons"]').count(),1,'Every menu tab must have a real icon');}assert.equal(await page.getByRole('tab',{name:'الحائط'}).count(),0);
 await page.getByRole('button',{name:'الإعلان 2'}).click();await page.getByText('خطوة صغيرة، أثر كبير',{exact:true}).waitFor();
 await page.getByRole('button').filter({hasText:'لحظات من روح المخيم'}).click();await page.getByText('صور توضيحية تجريبية؛ استبدلها بصور مجتمع سبارك.',{exact:true}).waitFor();await page.getByRole('button',{name:'إغلاق'}).click();
 await page.getByRole('tab',{name:'رحلات التعلّم'}).click();assert.equal(await page.getByText('القيادة تبدأ بالإنصات',{exact:true}).count(),0);
 await page.getByRole('button').filter({hasText:'لا نترك أحدًا خلفنا'}).click();
 assert.equal(await page.getByRole('button',{name:'حفظ التأمّل وإكمال الرحلة'}).isDisabled(),true);
 await page.getByLabel('تأمّلي الشخصي').fill('سأمشي إلى جانب صديقي وأساعده على الاستمرار.');await page.getByRole('button',{name:'حفظ التأمّل وإكمال الرحلة'}).click();await page.getByRole('button',{name:'حفظ تأمّلي',exact:true}).click();
 await page.getByLabel('تعليق على الرحلة').fill('التعاون يجعل الرحلة أجمل.');await page.getByRole('button',{name:'نشر تعليق'}).click();await page.getByText('التعاون يجعل الرحلة أجمل.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'إغلاق'}).click();await page.getByRole('tab',{name:'الترتيب'}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spark-camp-profile-v1')).completed.length),1);
 await page.reload();await page.getByRole('tab',{name:'رحلات التعلّم'}).click();await page.getByRole('button').filter({hasText:'لا نترك أحدًا خلفنا'}).click();assert.equal(await page.getByLabel('تأمّلي الشخصي').inputValue(),'سأمشي إلى جانب صديقي وأساعده على الاستمرار.');await page.getByRole('button',{name:'إغلاق'}).click();
 const admin=await context.newPage();admin.on('pageerror',e=>errors.push(e.message));await admin.goto(base);await admin.getByRole('button',{name:'إعلانات الصفحة الرئيسية',exact:true}).click();await admin.getByRole('button',{name:'تعديل',exact:true}).first().click();await admin.getByLabel('العنوان',{exact:true}).fill('إعلان معدّل من الإدارة');await admin.getByRole('button',{name:'حفظ المحتوى'}).click();await admin.getByRole('status').waitFor();
 await page.getByRole('tab',{name:'الرئيسية'}).click();await page.getByText('إعلان معدّل من الإدارة',{exact:true}).waitFor();
 await admin.getByRole('button',{name:'رحلات التعلّم',exact:true}).click();await admin.getByRole('button',{name:'إضافة محتوى'}).click();await admin.getByLabel('العنوان',{exact:true}).fill('رحلة جديدة تجريبية');await admin.getByLabel('النص القصير للقراءة').fill('نحترم الطبيعة ونتعاون في كل خطوة.');await admin.getByLabel('سؤال التأمّل').fill('كيف ستساعد فريقك؟');await admin.getByLabel('منشور ويظهر في التطبيق').check();await admin.getByRole('button',{name:'حفظ المحتوى'}).click();await page.getByRole('tab',{name:'رحلات التعلّم'}).click();await page.getByText('رحلة جديدة تجريبية',{exact:true}).waitFor();
 for(const role of ['pendingLeader','approvedLeader']){await page.evaluate(role=>{const p=JSON.parse(localStorage.getItem('spark-camp-profile-v1'));p.user.role=role;localStorage.setItem('spark-camp-profile-v1',JSON.stringify(p))},role);await page.reload();await page.getByRole('tab',{name:'رحلات التعلّم'}).click();assert.equal(await page.getByText('القيادة تبدأ بالإنصات',{exact:true}).count(),role==='approvedLeader'?1:0)}
 await admin.getByRole('button',{name:'نظرة عامة',exact:true}).click();await admin.getByLabel('رفع شعار سبارك').setInputFiles(require('node:path').join(__dirname,'../apps/admin/public/media/trail.png'));await admin.getByAltText('معاينة شعار سبارك').waitFor();await page.getByLabel('شعار سبارك').waitFor();
 await page.getByRole('tab',{name:'الرئيسية'}).click();await page.getByText('مغامرتنا تجمعنا',{exact:true}).waitFor();const header=await page.getByText('سبارك · نكبر معًا في المغامرة',{exact:true}).boundingBox();assert(header.y>=0&&header.y<150,'Header must remain visible in phone viewport');await page.screenshot({path:'/tmp/spark-camping-home.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS: gated home, slider, gallery, audience rules, reflections, comments, unique completion, persistence, admin editing/publishing, logo upload, visible phone header, no wall, zero runtime errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
