import type { Dashboard,Session,Task,WorkHoursReport,WorkInterval } from './types';
import { attachIntervals } from './conflicts';

export const request=<T,>(path:string,method='GET',body?:unknown)=>window.foco.request<T>(path,method,body);
export const sessions=(params:Record<string,string|number|boolean|undefined>={})=>{
  const query=new URLSearchParams();Object.entries(params).forEach(([key,value])=>{if(value!==undefined&&value!==''&&value!==false)query.set(key,String(value));});
  return Promise.all([request<Session[]>(`/api/sessions${query.size?'?'+query:''}`),request<WorkInterval[]>('/api/work-hours/intervals')])
    .then(([rows,intervals])=>attachIntervals(rows,intervals));
};
export const tasks=(query='',state='Todas')=>request<Task[]>(`/api/tasks?${new URLSearchParams({query,state,archive:'all'})}`);
export const dashboard=(params:Record<string,string>)=>{const query=new URLSearchParams();Object.entries(params).forEach(([key,value])=>{if(value!=='')query.set(key,value);});return request<Dashboard>(`/api/dashboard${query.size?'?'+query:''}`);};
export const workHours=(params:Record<string,string>={})=>{const query=new URLSearchParams();Object.entries(params).forEach(([key,value])=>{if(value!=='')query.set(key,value);});return request<WorkHoursReport>(`/api/work-hours${query.size?'?'+query:''}`);};
export const saveSession=(id:string,input:unknown)=>request<Session>(`/api/sessions/${encodeURIComponent(id)}`,'PUT',input);
export const safeMessage=(error:unknown)=>error instanceof Error?error.message:'Não foi possível concluir a operação.';
