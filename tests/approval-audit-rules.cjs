const assert=require('node:assert/strict');
const shared=require('../packages/shared');
const {adminSessionActor,cookie}=require('../apps/admin/lib/content-service.cjs');
const a=shared.normalizeActivity({id:'audit-camp',kind:'camp',title:'Camp',published:true,capacity:10,tentsEnabled:true,registrationTestMode:true,requireReceipt:true,tents:shared.defaultTents().map(t=>({...t,capacity:1}))});
const actor={type:'admin',session:'test-admin-session'};
let record=shared.submitRegistration(a,{id:'owner',name:'Parent'},{gender:'male',tentNumber:'0'},[],true).record;
record=shared.appendRegistrationAction(record,{action:'submitted',actor:{type:'camper'}});
for(const reason of ['', '  ', 'x', 'x'.repeat(1001)])assert.ok(shared.approveWithoutReceipt([record],record.id,[a],reason,actor).error);
assert.ok(shared.changeRegistrationStatus([record],record.id,'Confirmed',[a]).error);
const before=structuredClone(record);
const result=shared.approveWithoutReceipt([record],record.id,[a],'Payment made in cash',actor);
assert.equal(result.records[0].status,'Confirmed');assert.equal(result.records[0].receiptStatus,'notSubmitted');assert.equal(result.records[0].paymentWaiver.reason,'Payment made in cash');assert.deepEqual(record,before);
const audited=shared.appendRegistrationAction(result.records[0],{action:'approved_without_receipt',actor,before:record,reason:'Payment made in cash'});
assert.equal(audited.auditLog.length,2);assert.equal(audited.auditLog[1].fromStatus,'Pending');assert.equal(audited.auditLog[1].toStatus,'Confirmed');assert.equal(audited.auditLog[1].actor.session,actor.session);assert.ok(audited.auditLog[1].at);
const other=shared.submitRegistration({...a,tents:a.tents.map(t=>({...t,capacity:2}))},{id:'other',name:'Other'},{gender:'male',tentNumber:'0'},[record],true).record;
assert.ok(shared.approveWithoutReceipt([audited,other],other.id,[a],'Cash payment',actor).error,'waiving receipt must not bypass tent capacity');
console.log('PASS: missing/blank/oversize reasons rejected, ordinary approval still gated, reasoned override preserves receipt status and history without bypassing capacity');

const previous={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,password:process.env.ADMIN_PASSWORD};
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';process.env.ADMIN_PASSWORD='test-only-admin-password-1234';
const adminCookie=cookie(process.env.ADMIN_PASSWORD,false).split(';')[0];
const req=new Request('https://example.test',{headers:{cookie:adminCookie}});
const sessionActor=adminSessionActor(req);assert.equal(sessionActor.type,'admin');assert.match(sessionActor.session,/^[a-f0-9]{12}$/);assert.deepEqual(adminSessionActor(req),sessionActor);assert.equal(adminSessionActor(new Request('https://example.test')),null);
for(const [key,value]of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SERVICE_ROLE_KEY:previous.key,ADMIN_PASSWORD:previous.password})){if(value===undefined)delete process.env[key];else process.env[key]=value;}
console.log('PASS: audit actor uses authenticated session fingerprint without exposing the session cookie');
