import type { Dashboard,Session,UndefinedPeriod } from './types';

export function undefinedSessions(periods:UndefinedPeriod[],filters:Record<string,string>):Session[]{
 // Gaps are global: never attribute them to a filtered client, project or consultant.
 if(['client','project','consultant','status','category'].some(key=>filters[key]?.trim()))return [];
 const text='A definir Lacuna da jornada';
 if(['query','activity'].some(key=>filters[key]?.trim()&&!text.toLocaleLowerCase('pt-BR').includes(filters[key].trim().toLocaleLowerCase('pt-BR'))))return [];
 return periods.filter(p=>(!filters.from||p.day>=filters.from)&&(!filters.to||p.day<=filters.to))
 .filter(p=>(!filters.minHours||p.seconds>=Number(filters.minHours)*3600)&&(!filters.maxHours||p.seconds<=Number(filters.maxHours)*3600))
 .filter(()=>!filters.minValue||Number(filters.minValue)<=0)
 .map(p=>({id:`undefined:${p.startAt}:${p.endAt}`,virtual:true,taskId:null,client:'',project:'',consultant:'',cardReference:'',
  activity:'A definir',details:'Lacuna da jornada',startAt:p.startAt,endAt:p.endAt,focusSeconds:p.seconds,plannedSeconds:0,
  hourlyRate:null,status:'Encerrada',category:'Normal'}));
}
export function dashboardWithUndefined(data:Dashboard|null,rows:Session[]):Dashboard|null{
 if(!data||!rows.length)return data;
 const seconds=rows.reduce((n,s)=>n+s.focusSeconds,0);
 return {...data,seconds:data.seconds+seconds,comparison:data.comparison?{...data.comparison,realSeconds:data.comparison.realSeconds+seconds,roundedSeconds:data.comparison.roundedSeconds+seconds}:undefined,groups:[...data.groups,{name:'A definir (jornada)',parent:null,client:null,seconds,sessions:0,value:0,unpriced:0}]};
}
