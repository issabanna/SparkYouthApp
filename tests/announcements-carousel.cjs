const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');
const shared=require('../packages/shared');
(async()=>{
 const root=path.resolve(__dirname,'..'),base='http://localhost:3062';
 const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3062'],{cwd:path.join(root,'apps/admin'),env:{...process.env,SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:'ignore'});
 let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let count=3;const announcements=Array.from({length:3},(_,i)=>({id:'test-'+i,title:'Announcement '+(i+1),text:'Test announcement',image:'/media/team.png',published:true}));
  await context.addInitScript(()=>localStorage.setItem('spark-camp-profile-v1',JSON.stringify({user:{name:'Carousel test',role:'camper'},completed:[],reflections:{}})));
  await page.route('**/api/content',route=>route.fulfill({json:{...shared.defaultContent,schemaVersion:shared.contentVersion,announcements:[...announcements.slice(0,count),{id:'hidden',title:'Draft announcement',published:false}]}}));
  for(let i=0;i<50;i++){try{await page.goto(base+'/app');break}catch{await new Promise(r=>setTimeout(r,100))}}
  const card=page.getByTestId('announcement-carousel');await card.getByText('Announcement 1',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/^الإعلان [123]$/}).count(),3);
  await page.getByRole('button',{name:'الإعلان التالي',exact:true}).click();await card.getByText('Announcement 2',{exact:true}).waitFor();
  await page.getByRole('button',{name:'الإعلان السابق',exact:true}).click();await card.getByText('Announcement 1',{exact:true}).waitFor();
  await page.getByRole('button',{name:'الإعلان 3',exact:true}).click();await card.getByText('Announcement 3',{exact:true}).waitFor();
  const swipe=async direction=>{const box=await card.boundingBox(),start=box.x+(direction==='left'?box.width*.8:box.width*.2),end=box.x+(direction==='left'?box.width*.2:box.width*.8),y=box.y+box.height*.5;await page.mouse.move(start,y);await page.mouse.down();await page.mouse.move(end,y,{steps:12});await page.mouse.up()};
  await swipe('left');await card.getByText('Announcement 1',{exact:true}).waitFor();await swipe('right');await card.getByText('Announcement 3',{exact:true}).waitFor();
  const cdp=await context.newCDPSession(page);const box=await card.boundingBox(),y=box.y+box.height*.5;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y}]});
  for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.8-.06*i),y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await card.getByText('Announcement 1',{exact:true}).waitFor();
  // Vertical gestures must remain page scrolling rather than change the announcement.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+100,y}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+100,y:y-i*15}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await card.getByText('Announcement 1',{exact:true}).waitFor();
  count=1;await page.reload();await card.getByText('Announcement 1',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'الإعلان التالي',exact:true}).count(),0);
  count=0;await page.reload();await page.getByRole('tab',{name:'حسابي',exact:true}).waitFor();assert.equal(await card.count(),0);assert.deepEqual(errors,[]);
  console.log('PASS announcement next/previous/dots, mouse and touch swipes, wraparound, vertical gesture isolation, one/zero announcements and draft exclusion.');
 }finally{await browser?.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
