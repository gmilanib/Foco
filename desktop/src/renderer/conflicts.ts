import type { Session,WorkInterval } from './types';

type Span={start:number;end:number};
export type SessionConflict={first:Session;second:Session;seconds:number;estimated:boolean;spans:Span[]};
function merge(spans:Span[]):Span[]{
 const result:Span[]=[];
 for(const span of spans.filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.end>s.start).sort((a,b)=>a.start-b.start)){
  const last=result.at(-1);
  if(last&&span.start<=last.end)last.end=Math.max(last.end,span.end);else result.push({...span});
 }
 return result;
}
export function sessionSpans(session:Session):Span[]{
 const intervals=session.workIntervals;
 if(intervals?.length)return merge(intervals.map(i=>({start:Date.parse(i.startAt),end:Date.parse(i.endAt||i.lastTickAt)})));
 return merge([{start:Date.parse(session.startAt),end:Date.parse(session.endAt||session.startAt)}]);
}
const estimated=(s:Session)=>!s.workIntervals?.length||s.workIntervals.some(i=>i.precision!=='Precisa');
export function sessionConflicts(sessions:Session[]):SessionConflict[]{
 const result:SessionConflict[]=[];
 const rows=sessions.map(session=>({session,spans:sessionSpans(session)})).filter(row=>row.spans.length).sort((a,b)=>a.spans[0].start-b.spans[0].start);
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j];if(b.spans[0].start>=a.spans[a.spans.length-1].end)break;
  if(a.session.id===b.session.id)continue;
  const spans=merge(a.spans.flatMap(x=>b.spans.map(y=>({start:Math.max(x.start,y.start),end:Math.min(x.end,y.end)}))));
  const seconds=spans.reduce((n,s)=>n+(s.end-s.start)/1000,0);
  if(seconds>0)result.push({first:a.session,second:b.session,seconds,estimated:estimated(a.session)||estimated(b.session),spans});
 }
 return result;
}
export function occupiedSeconds(sessions:Session[]):number{
 return merge(sessions.flatMap(sessionSpans)).reduce((n,s)=>n+(s.end-s.start)/1000,0);
}
export function attachIntervals(sessions:Session[],intervals:WorkInterval[]):Session[]{
 const grouped=new Map<string,WorkInterval[]>();
 for(const interval of intervals){const rows=grouped.get(interval.sessionId)||[];rows.push(interval);grouped.set(interval.sessionId,rows);}
 return sessions.map(s=>({...s,workIntervals:grouped.get(s.id)||[]}));
}
