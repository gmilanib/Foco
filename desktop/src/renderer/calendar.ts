import { isoDay } from './format';
export function shiftDay(day:string,amount:number){const date=new Date(`${day}T12:00:00`);date.setDate(date.getDate()+amount);return isoDay(date);}
export function weekDays(day:string){const date=new Date(`${day}T12:00:00`);const monday=shiftDay(day,-((date.getDay()+6)%7));return Array.from({length:7},(_,index)=>shiftDay(monday,index));}
export function validDay(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T12:00:00`);return Number.isFinite(date.getTime())&&isoDay(date)===value;
}
