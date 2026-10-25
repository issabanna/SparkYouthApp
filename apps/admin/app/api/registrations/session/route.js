import {reply} from '../../../../lib/registration-service';
export const runtime='nodejs';
export async function POST(){return reply({error:'تسجيل الدخول بحساب حقيقي مطلوب.'},401);}
