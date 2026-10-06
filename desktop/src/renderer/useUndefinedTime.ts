import { useEffect,useState } from 'react';
import { safeMessage,workHours } from './api';
import type { UndefinedPeriod } from './types';

export function useUndefinedTime(screen:'dashboard'|'reports',range:{from:string;to:string},revision:unknown){
 const key=`foco.${screen}.includeUndefined`;
 const [included,setIncluded]=useState(()=>{try{return localStorage.getItem(key)==='true';}catch{return false;}});
 const [result,setResult]=useState<{periods:UndefinedPeriod[];error:string;from:string;to:string;revision:unknown}|null>(null);
 const change=(value:boolean)=>{setIncluded(value);try{localStorage.setItem(key,String(value));}catch{/* The view still works without storage. */}};
 useEffect(()=>{
  let cancelled=false;setResult(null);
  const identity={from:range.from,to:range.to,revision};
  if(included)void workHours({from:range.from,to:range.to}).then(report=>{if(!cancelled)setResult({...identity,periods:report.undefinedPeriods||[],error:''});})
   .catch(e=>{if(!cancelled)setResult({...identity,periods:[],error:safeMessage(e)});});
  return()=>{cancelled=true;};
 },[included,range.from,range.to,revision]);
 const current=included&&result?.from===range.from&&result?.to===range.to&&result?.revision===revision?result:null;
 return {included,change,periods:current?.periods||[],error:current?.error||'',loading:included&&!current};
}
