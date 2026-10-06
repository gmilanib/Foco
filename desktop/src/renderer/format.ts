import { focusSeconds,type HoursMode } from './hoursBasis';
import type { Session,WorkHoursReport } from './types';

const moneyFormat=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
export const money=(value:number|null|undefined)=>value==null?'—':moneyFormat.format(value);
export const duration=(seconds:number)=>{const minutes=Math.max(0,Math.round(seconds/60));return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}min`;};
export const clock=(seconds:number)=>{const n=Math.ceil(Math.max(0,seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
export const localDate=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
export const amount=(session:Session)=>session.hourlyRate==null?null:Math.round(session.hourlyRate*session.focusSeconds/3600*100)/100;
export const hourInput=(value:string)=>{
 const raw=value.trim();if(!raw)return null;
 const brazilian=/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw);
 const decimalDot=/^\d+\.\d{1,2}$/.test(raw);
 const normalized=brazilian?raw.replace(/\./g,'').replace(',','.'):raw;
 const rate=Number(normalized);
 if((!brazilian&&!decimalDot)||!Number.isFinite(rate)||rate<0||rate>1_000_000)throw new Error('Informe de 0 a 1.000.000,00 ou deixe em branco.');
 return rate;
};
export const isoDay=(day:Date)=>`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
export const localDayStartIso=(day:string,offset=0)=>{const [year,month,date]=day.split('-').map(Number);return new Date(year,month-1,date+offset).toISOString();};
export const csvCell=(raw:unknown)=>{let value=String(raw??'');if(value.trimStart()&&'=+-@'.includes(value.trimStart()[0]))value="'"+value;return `"${value.replaceAll('"','""')}"`;};
export const sessionCsv=(rows:Session[],showValues:boolean,endMode:'real'|'rounded'='real',hoursMode:HoursMode='rounded')=>{
  const headers=['Cliente','Projeto','Consultor_solicitante','Card_ou_Link','Atividade','Detalhamento','Inicio','Termino','Duracao_planejada_segundos','Tempo_foco_segundos','Resultado','Categoria','Base_horas','Base_termino',...(showValues?['Valor_hora_BRL','Custo_BRL']:[])];
  const lines=rows.map(s=>[s.client,s.project,s.consultant,s.cardReference,s.activity,s.details,s.startAt,(endMode==='rounded'?(s.roundedEndAt??s.endAt):s.endAt)||'',s.plannedSeconds,focusSeconds(s,hoursMode),s.virtual?'A definir':s.status,s.virtual?'':s.category,hoursMode,endMode,...(showValues?[s.hourlyRate??'',s.hourlyRate==null?'':(s.hourlyRate*focusSeconds(s,hoursMode)/3600).toFixed(2)]:[])].map(csvCell).join(';'));
  return '\uFEFF'+[headers.map(csvCell).join(';'),...lines].join('\r\n');
};
export const workHoursCsv=(report:WorkHoursReport)=>{
  const headers=['Data','Tipo','Inicio','Termino','Total_trabalhado_segundos','A_definir_segundos','Horas_normais_segundos','Extra_time_segundos','Precisao'];
  const days=report.days.map(row=>[row.day,'Resumo diário','','',row.workedSeconds,row.undefinedSeconds,row.regularSeconds,row.extraSeconds,row.estimated?'Estimado':'Preciso']);
  const gaps=report.undefinedPeriods.map(row=>[row.day,'A definir',row.startAt,row.endAt,row.seconds,'','','','Preciso']);
  return '\uFEFF'+[headers.map(csvCell).join(';'),...days,...gaps].map(row=>Array.isArray(row)?row.map(csvCell).join(';'):row).join('\r\n');
};
