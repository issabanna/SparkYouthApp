const assert = require('node:assert/strict');
const {normalizeContent, defaultContent}=require('../packages/shared');
const {publicContent}=require('../apps/admin/lib/content-service.cjs');
const input={...defaultContent,schemaVersion:5,registrationOptions:{cityOptions:['عمان'],schoolOptions:[],shirtOptions:['S','M'],title:'bad'}};
const content=normalizeContent(input);
for(const a of content.activities){assert.deepEqual(a.cityOptions,['عمان']);assert.deepEqual(a.schoolOptions,[]);assert.deepEqual(a.shirtOptions,['S','M']);assert.notEqual(a.title,'bad');}
assert.deepEqual(publicContent(content).registrationOptions,content.registrationOptions);
const deleted=normalizeContent({...content,activities:content.activities.filter(a=>a.id!=='e1')});
assert.ok(!deleted.activities.some(a=>a.id==='e1'));
assert.ok(!publicContent(deleted).activities.some(a=>a.id==='e1'));
console.log('PASS: shared registration choices, public sync and deleted activity stays removed');
const {normalizeActivity,tentOccupancy}=require('../packages/shared');
const camp=normalizeActivity({kind:'camp',seatsTaken:7,tents:[{number:12,seatsTaken:4}]});
assert.equal(camp.seatsTaken,0);
assert.equal(tentOccupancy(camp,12,[]),0);
assert.equal(tentOccupancy(camp,12,[{id:'pending-test',activityId:camp.id,status:'Pending',details:{tentNumber:12}}]),1);
console.log('PASS: legacy manual reservations no longer reduce capacity; pending registrations do');
