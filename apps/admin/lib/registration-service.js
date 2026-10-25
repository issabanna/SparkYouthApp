import {createHash} from 'node:crypto';
import shared from '../../../packages/shared';
import service from './content-service.cjs';
import {readContent} from './content-store';
import {listRegistrations,registrationOccupancy,displayRegistration} from './registration-store';
export function ownerHash(request){const match=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')||'');return match?createHash('sha256').update(match[1]).digest('hex'):null;}
export const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function registrationContent(){return shared.normalizeContent(await readContent()||service.defaultContent);}
export async function ownerResponse(owner){const [records,occupancy,content]=await Promise.all([listRegistrations(owner),registrationOccupancy(),registrationContent()]);return {shared:true,records:records.filter(r=>!r.activityId.startsWith('__')).map(r=>({...displayRegistration(r),instructionText:shared.registrationInstructions(content.activities.find(a=>a.id===r.activityId),r)})),occupancy};}
export const unavailable=()=>reply({error:'التسجيل غير متاح الآن. يرجى المحاولة لاحقًا أو التواصل مع الإدارة.'},503);
