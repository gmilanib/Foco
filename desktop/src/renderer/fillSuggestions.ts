import type { Session,Task } from './types';

export const suggestionFields=['client','project','activity','consultant','cardReference','hourlyRate'] as const;
export type SuggestionField=typeof suggestionFields[number];
export type FillSuggestion=Record<SuggestionField,string>;

const text=(value:string|number|null|undefined)=>value==null?'':String(value).trim();
const rateText=(value:number|null)=>value==null?'':value.toLocaleString('pt-BR',{maximumFractionDigits:2});
const normalize=(value:string)=>value.trim().toLocaleLowerCase('pt-BR');
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
