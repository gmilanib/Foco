import type { Session } from './types';
export type TimelineSegment={kind:'work'|'pause'|'estimated';start:number;end:number;session:Session;provisional:boolean};
export function dayBounds(day:string){const start=new Date(`${day}T00:00:00`),end=new Date(start);end.setDate(end.getDate()+1);return {start:start.getTime(),end:end.getTime()};}
export function timelineSegments(sessions:Session[],day:string):TimelineSegment[]{
 const bounds=dayBounds(day),result:TimelineSegment[]=[];
 const add=(session:Session,kind:TimelineSegment['kind'],start:number,end:number,provisional=false)=>{
  start=Math.max(start,bounds.start);end=Math.min(end,bounds.end);if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)result.push({session,kind,start,end,provisional});
 };
 for(const session of sessions){
  const intervals=session.workIntervals??[],precise=intervals.length>0&&intervals.every(i=>i.precision==='Precisa');
  const start=new Date(session.startAt).getTime(),end=session.endAt?new Date(session.endAt).getTime():Math.max(start,...intervals.map(i=>new Date(i.endAt??i.lastTickAt).getTime()));
  if(!precise){add(session,'estimated',start,end,!session.endAt);continue;}
  const ordered=intervals.map(i=>({start:new Date(i.startAt).getTime(),end:new Date(i.endAt??i.lastTickAt).getTime(),open:!i.endAt})).sort((a,b)=>a.start-b.start);
  let covered=start;
  for(const interval of ordered){if(interval.start>covered)add(session,'pause',covered,interval.start);add(session,'work',interval.start,interval.end,interval.open);covered=Math.max(covered,interval.end);}
  if(session.endAt&&end>covered)add(session,'pause',covered,end);
 }
 return result.sort((a,b)=>a.start-b.start||a.session.id.localeCompare(b.session.id));
}
