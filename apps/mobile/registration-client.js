import {authenticatedRequest} from './auth-client';
const request=(path,body)=>authenticatedRequest(path,{method:body?'POST':'GET',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
export const registrationRequest=body=>request('/api/registrations',body);
export const leaderRequest=body=>request('/api/leaders',body);
export const accountRequest=body=>request('/api/account',body);
export const busRequest=(body,activityId)=>request('/api/bus'+(activityId?'?activity='+encodeURIComponent(activityId):''),body);
export const evaluationRequest=(activity,section,body)=>request('/api/leader-evaluations'+(!body?'?activity='+encodeURIComponent(activity)+'&section='+encodeURIComponent(section):''),body?{...body,activityId:activity,section}:null);
export const leaderPersonRequest=(activity,section,id)=>request('/api/leader-person?'+new URLSearchParams({activity,section,id}));
