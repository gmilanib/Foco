import type { Session,Task } from './types';
import { canSelectForSession } from './organization';

export const suggestionFields=['client','project','activity','consultant','cardReference','hourlyRate'] as const;
export type SuggestionField=typeof suggestionFields[number];
export type FillSuggestion=Record<SuggestionField,string>;

const text=(value:string|number|null|undefined)=>value==null?'':String(value).trim();
const rateText=(value:number|null)=>value==null?'':value.toLocaleString('pt-BR',{maximumFractionDigits:2});
const normalize=(value:string)=>value.trim().toLocaleLowerCase('pt-BR');
export function sameClientProject(item:{client:string;project:string},client:string,project:string){
 return !!normalize(client)&&!!normalize(project)&&normalize(item.client)===normalize(client)&&normalize(item.project)===normalize(project);
}
export function consultantForPair(history:Session[],tasks:Task[],client:string,project:string):string{
 const rows=history.filter(s=>sameClientProject(s,client,project)&&s.consultant.trim()&&Number.isFinite(Date.parse(s.startAt)))
  .sort((a,b)=>Date.parse(b.startAt)-Date.parse(a.startAt)||a.id.localeCompare(b.id));
 if(rows.length)return rows[0].consultant.trim();
 const names=new Map(tasks.filter(t=>canSelectForSession(t)&&sameClientProject(t,client,project)&&t.consultant.trim()).map(t=>[normalize(t.consultant),t.consultant.trim()]));
 return names.size===1?[...names.values()][0]:'';
}
export function changeClientProject<T extends {client:string;project:string;consultant:string}>(form:T,field:'client'|'project',value:string,history:Session[],tasks:Task[]):T{
 if(form[field]===value)return form;
 const next={...form,[field]:value,...(field==='client'?{project:''}:{})};
 return {...next,consultant:consultantForPair(history,tasks,next.client,next.project)};
}
const fromTask=(task:Task):FillSuggestion=>({client:text(task.client),project:text(task.project),activity:text(task.activity),consultant:text(task.consultant),cardReference:text(task.cardReference),hourlyRate:rateText(task.hourlyRate)});
const fromSession=(session:Session):FillSuggestion=>({client:text(session.client),project:text(session.project),activity:text(session.activity),consultant:text(session.consultant),cardReference:text(session.cardReference),hourlyRate:rateText(session.hourlyRate)});

export function buildFillSuggestions(history:Session[],tasks:Task[]):FillSuggestion[]{
 const seen=new Set<string>(),suggestions:FillSuggestion[]=[];
 for(const item of [...tasks.map(fromTask),...history.map(fromSession)]){
  const key=suggestionFields.map(field=>normalize(item[field])).join('|');
  if(key==='|||||'||seen.has(key))continue;
  seen.add(key);suggestions.push(item);
 }
 return suggestions;
}

export function valuesFor(items:FillSuggestion[],field:SuggestionField,typed=''):string[]{
 const seen=new Set<string>(),values:string[]=[],query=normalize(typed);
 for(const item of items){
  const value=item[field],key=normalize(value);
  if(!key||seen.has(key)||!key.includes(query)||key===query)continue;
  seen.add(key);values.push(value);
  if(values.length===20)break;
 }
 return values;
}
