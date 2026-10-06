import { useEffect,useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Card,Field } from '../components/Field';
import { WorkHoursSummary } from '../components/WorkHoursSummary';
import { UndefinedPeriodsPage } from '../components/UndefinedPeriodsPage';
import { isoDay } from '../format';
import type { WorkHoursReport } from '../types';

type Range={from:string;to:string};
type Props={onReview?:(periods:WorkHoursReport['undefinedPeriods'])=>void;initialDay?:string;initialUndefined?:boolean;report:WorkHoursReport;onRefresh:(range:Range)=>void;onExport:(report:WorkHoursReport)=>void;onBook:(period:WorkHoursReport['undefinedPeriods'][number])=>void};

export function WorkHoursPage({report,onRefresh,onExport,onBook,initialDay,initialUndefined,onReview}:Props){
 const today=isoDay(new Date());
 const periods=report?.undefinedPeriods??[];
 const [range,setRange]=useState<Range>({from:initialDay||today,to:initialDay||today}),[tab,setTab]=useState<'summary'|'undefined'>(initialUndefined?'undefined':'summary');
 useEffect(()=>{onRefresh(range);},[]);
 return <div className="page-stack">
  <div className="page-title"><div><h1>Jornada</h1><p>Horas trabalhadas, períodos A definir e extra-time por dia.</p></div><CalendarDays size={24} aria-hidden="true"/></div>
  <Card title="Período da jornada">
   <div className="form-grid form-grid--four">
    <Field label="Data inicial"><input type="date" value={range.from} onChange={e=>setRange(value=>({...value,from:e.target.value}))}/></Field>
    <Field label="Data final"><input type="date" value={range.to} onChange={e=>setRange(value=>({...value,to:e.target.value}))}/></Field>
   </div>
   <div className="actions"><button className="button button--primary" onClick={()=>onRefresh(range)}>Atualizar jornada</button><button className="button" onClick={()=>{const all={from:'',to:''};setRange(all);onRefresh(all);}}>Todo o período</button></div>
  </Card>
  <div className="catalog-tabs" role="tablist" aria-label="Visões da jornada"><button role="tab" aria-selected={tab==='summary'} className={`button ${tab==='summary'?'button--primary':''}`} onClick={()=>setTab('summary')}>Resumo</button><button role="tab" aria-selected={tab==='undefined'} className={`button ${tab==='undefined'?'button--primary':''}`} onClick={()=>setTab('undefined')}>A definir ({periods.length})</button></div>
  {tab==='summary'?<WorkHoursSummary report={report} onExport={onExport}/>:<UndefinedPeriodsPage periods={periods} onBook={onBook} onReview={onReview}/>}
 </div>;
}
