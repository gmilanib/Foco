import { isoDay } from './format';
import { shiftDay,weekDays } from './calendar';
import type { TimelineSegment } from './timeline';

export type TimelineView='all'|'client'|'project';
// Keep exact boundaries and mark every local full hour inside the recorded span.
export function hourlyTimelineTicks(start:number,end:number):number[]{
 const ticks=[start],hour=new Date(start);
 hour.setMinutes(0,0,0);
 let time=hour.getTime()+60*60*1000;
 for(;time<end;time+=60*60*1000)ticks.push(time);
 if(end>start)ticks.push(end);
 return ticks;
}
// Each occupied day contributes only its recorded span to the shared axis.
export function timelineScale(days:{day:string;segments:TimelineSegment[]}[]){
 let duration=0;
 const windows=days.filter(d=>d.segments.length).map(({day,segments})=>{
  const start=Math.min(...segments.map(s=>s.start)),end=Math.max(...segments.map(s=>s.end));
  const offset=duration;duration+=end-start;
  const gaps:{start:number;end:number}[]=[];
  let covered=start;
  for(const segment of [...segments].sort((a,b)=>a.start-b.start)){
   if(segment.start>covered)gaps.push({start:covered,end:segment.start});
   covered=Math.max(covered,segment.end);
  }
  return {day,start,end,offset,gaps};
 });
 const position=(time:number)=>{
  for(const window of windows){
   if(time<=window.end)return (window.offset+Math.max(0,time-window.start))/(duration||1)*100;
  }
  return windows.length?100:0;
 };
 return {windows,position};
}
export function timelineGroups(segments:TimelineSegment[],view:TimelineView){
 const groups=new Map<string,{key:string;label:string;segments:TimelineSegment[]}>();
 for(const segment of segments){
  const {client,project}=segment.session;
  const key=view==='project'?JSON.stringify([client,project]):view;
  if(!groups.has(key))groups.set(key,{key,label:view==='all'?'Geral':view==='client'?'Trajetória por cliente':`${client||'Sem cliente'} / ${project||'Sem projeto'}`,segments:[]});
  groups.get(key)!.segments.push(segment);
 }
 return Array.from(groups.values()).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR')).map(group=>{
  const lanes:number[]=[];
  const blocks=[...group.segments].sort((a,b)=>a.start-b.start||a.session.id.localeCompare(b.session.id)).map(segment=>{
   let lane=lanes.findIndex(end=>end<=segment.start);
   if(lane<0)lane=lanes.length;
   lanes[lane]=segment.end;
   return {...segment,lane};
  });
  return {...group,blocks,laneCount:lanes.length};
 });
}

export type TimelinePeriod='day'|'week'|'month';
export function timelineDays(day:string,period:TimelinePeriod):string[]{
 if(period==='day')return [day];
 if(period==='week')return weekDays(day);
 const date=new Date(`${day}T12:00:00`);
 const count=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
 return Array.from({length:count},(_,index)=>isoDay(new Date(date.getFullYear(),date.getMonth(),index+1)));
}
export function shiftTimeline(day:string,period:TimelinePeriod,direction:number){
 if(period!=='month')return shiftDay(day,direction*(period==='week'?7:1));
 const date=new Date(`${day}T12:00:00`);
 return isoDay(new Date(date.getFullYear(),date.getMonth()+direction,1));
}
