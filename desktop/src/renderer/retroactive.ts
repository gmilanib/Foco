import type { Session } from './types';

export function intervalMinutes(start:string,end:string):number|null{
 const startTime=new Date(start).getTime(),endTime=new Date(end).getTime();
 if(!Number.isFinite(startTime)||!Number.isFinite(endTime)||endTime<=startTime)return null;
 return Math.floor((endTime-startTime)/60000);
}

export function effectiveFocusMinutes(hours:string,minutes:string,maximum:number):number{
 if(!/^\d+$/.test(hours)||!/^\d+$/.test(minutes))throw new Error('Informe horas e minutos de foco válidos.');
 const hourCount=Number(hours),minuteCount=Number(minutes),total=hourCount*60+minuteCount;
 if(!Number.isSafeInteger(total)||minuteCount>59||total<1)throw new Error('Informe ao menos um minuto de foco, com minutos entre 0 e 59.');
 if(total>maximum)throw new Error('O foco efetivo não pode exceder o intervalo entre início e término.');
 return total;
}

export function overlappingSessions(history:Session[],start:string,end:string,now=new Date()):Session[]{
 const startTime=new Date(start).getTime(),endTime=new Date(end).getTime();
 if(!Number.isFinite(startTime)||!Number.isFinite(endTime)||endTime<=startTime)return [];
 return history.filter(session=>{
  const existingStart=new Date(session.startAt).getTime();
  const existingEnd=session.endAt?new Date(session.endAt).getTime():now.getTime();
  return Number.isFinite(existingStart)&&Number.isFinite(existingEnd)&&existingStart<endTime&&existingEnd>startTime;
 });
}
