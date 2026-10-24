import service from '../../../lib/content-service.cjs';
import {readContent} from '../../../lib/content-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
 if(!service.configured())return Response.json({configured:false},{status:503,headers:{'Cache-Control':'no-store'}});
 try{return Response.json(service.publicContent(await readContent()||service.defaultContent),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Content unavailable'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
