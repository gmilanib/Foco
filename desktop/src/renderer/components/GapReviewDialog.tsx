import { useState } from 'react';
import { request,workHours } from '../api';
import { RetroactiveDialog,type RetroactiveClassification } from './RetroactiveDialog';
import type { Catalogs,Color,Session,Task,UndefinedPeriod } from '../types';
import type { Draft } from '../pages/FocusPage';

type Props={periods:UndefinedPeriod[];initial:Draft;history:Session[];tasks:Task[];catalogs:Catalogs;colors:Color[];defaultRate:string;showValues:boolean;onClose:()=>void;onChanged:()=>Promise<void>};
export function GapReviewDialog({periods,initial,onClose,onChanged,...props}:Props){
 const [queue,setQueue]=useState(periods),[index,setIndex]=useState(0),[reuse,setReuse]=useState(false);
 const [classification,setClassification]=useState<RetroactiveClassification>(),[version,setVersion]=useState(0);
 const period=queue[index];
 if(!period)return null;
 const save=async(input:Record<string,unknown>)=>{
  // Recheck the selected gap immediately before writing, including changes from other windows.
  const fresh=await workHours({from:period.day,to:period.day});
  const start=Date.parse(String(input.startAt)),end=Date.parse(String(input.endAt));
  if(start<Date.parse(period.startAt)||end>Date.parse(period.endAt)||!fresh.undefinedPeriods.some(p=>Date.parse(p.startAt)<=start&&Date.parse(p.endAt)>=end))
   throw new Error('O intervalo não está mais disponível nesta lacuna. Feche a revisão e atualize a Jornada.');
  await request('/api/sessions/retroactive/gap','POST',input);
  const copy:RetroactiveClassification={};
  for(const key of ['client','project','activity','details','consultant','cardReference','category','status','taskId'] as const)
   if(typeof input[key]==='string')copy[key]=input[key] as never;
  copy.hourlyRate=input.hourlyRate==null?'':String(input.hourlyRate);
  setClassification(copy);
  // The written interval is removed immediately, so a refresh failure cannot invite a duplicate save.
  const fragments:UndefinedPeriod[]=[];
  if(start>Date.parse(period.startAt))fragments.push({...period,endAt:String(input.startAt),seconds:(start-Date.parse(period.startAt))/1000});
  if(end<Date.parse(period.endAt))fragments.push({...period,startAt:String(input.endAt),seconds:(Date.parse(period.endAt)-end)/1000});
  const remaining=[...queue.slice(0,index),...fragments,...queue.slice(index+1)];
  setQueue(remaining);setIndex(Math.min(index,Math.max(0,remaining.length-1)));setVersion(v=>v+1);
  if(!remaining.length)onClose();
  await onChanged();
 };
 return <RetroactiveDialog key={`${period.startAt}-${version}`} {...props} initial={initial} classification={reuse?classification:undefined}
  preset={{startAt:period.startAt,endAt:period.endAt,focusMinutes:Math.floor(period.seconds/60)}} onClose={onClose} onSave={save}
  navigation={busy=><div><p role="status">Revisar lacuna {index+1} de {queue.length}. Confira horários e classificação antes de salvar.</p><div className="actions">
   <button type="button" className="button" disabled={busy||index===0} onClick={()=>setIndex(i=>i-1)}>Anterior</button>
   <button type="button" className="button" disabled={busy||index===queue.length-1} onClick={()=>setIndex(i=>i+1)}>Próxima</button>
  </div><label className="check-row"><input type="checkbox" checked={reuse} disabled={busy} onChange={e=>setReuse(e.target.checked)}/> Reaproveitar a classificação do último lançamento salvo</label></div>}/>
}
