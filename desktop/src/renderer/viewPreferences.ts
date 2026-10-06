import { useEffect,useState } from 'react';

const prefix='foco.view.v1.';
export function readView<T>(key:string,fallback:T,valid:(value:unknown)=>value is T):T {
 try{const value:unknown=JSON.parse(localStorage.getItem(prefix+key)||'null');return valid(value)?value:fallback;}catch{return fallback;}
}
export function writeView(key:string,value:unknown){
 try{localStorage.setItem(prefix+key,JSON.stringify(value));}catch{/* Viewing remains available when storage is unavailable. */}
}
export const oneOf=<T extends string>(...values:T[])=>(value:unknown):value is T=>typeof value==='string'&&values.includes(value as T);
export const stringList=(value:unknown):value is string[]=>Array.isArray(value)&&value.length<=1000&&value.every(v=>typeof v==='string');
export function useViewState<T>(key:string,fallback:T,valid:(value:unknown)=>value is T){
 const [value,setValue]=useState<T>(()=>readView(key,fallback,valid));
 useEffect(()=>writeView(key,value),[key,value]);
 return [value,setValue] as const;
}
