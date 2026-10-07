import { isoDay } from './format';
import { validDay,weekDays } from './calendar';
export type ViewPeriod='all'|'today'|'week'|'fixed';
export type SavedView<T>={id:string;name:string;period:ViewPeriod;criteria:T};
export type Validator<T>=(value:unknown)=>value is T;
export const viewText=(value:unknown)=>typeof value==='string'&&value.length<=1000;
export const viewDate=(value:unknown)=>value===''||validDay(value);
export const viewNumber=(value:unknown)=>value===''||typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0;
export const viewChoice=(...choices:string[])=>(value:unknown)=>typeof value==='string'&&choices.includes(value);
export function viewFields<T>(schema:Record<string,(value:unknown)=>boolean>):Validator<T>{
 return (value:unknown):value is T=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===Object.keys(schema).length&&Object.entries(schema).every(([key,validate])=>validate((value as Record<string,unknown>)[key]));
}
const keyFor=(scope:string)=>`foco.saved-views.v1.${scope}`;
export function readSavedViews<T>(scope:string,validate:Validator<T>):SavedView<T>[] {
 try{const data:unknown=JSON.parse(localStorage.getItem(keyFor(scope))||'[]');if(!Array.isArray(data))return [];const ids=new Set<string>();return data.slice(0,25).filter((row):row is SavedView<T>=>{
  if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>80||!['all','today','week','fixed'].includes(row.period)||!validate(row.criteria))return false;
  ids.add(row.id);return true;
 });}catch{return [];}
}
export function writeSavedViews<T>(scope:string,rows:SavedView<T>[]){
 if(rows.length>25)throw new Error('Salve até 25 visões por tela.');
 try{localStorage.setItem(keyFor(scope),JSON.stringify(rows));}catch{throw new Error('Não foi possível salvar as visões neste perfil. Libere espaço e tente novamente.');}
}
export function viewDates<T extends object>(criteria:T,period:ViewPeriod,fromKey:string,toKey:string,today=isoDay(new Date())):T {
 if(period==='fixed')return {...criteria};
 const days=weekDays(today);const from=period==='all'?'':period==='today'?today:days[0],to=period==='all'?'':period==='today'?today:days[6];
 return {...criteria,[fromKey]:from,[toKey]:to};
}
