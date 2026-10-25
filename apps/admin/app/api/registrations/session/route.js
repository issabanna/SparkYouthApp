import {randomBytes} from 'node:crypto';
import service from '../../../../lib/content-service.cjs';
import {reply} from '../../../../lib/registration-service';
export const runtime='nodejs';
export async function POST(request){
 if(!service.sameOrigin(request))return reply({error:'Forbidden'},403);
 if(!service.configured())return reply({shared:false});
 return reply({shared:true,token:randomBytes(32).toString('hex')});
}
