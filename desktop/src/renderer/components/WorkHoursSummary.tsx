import { useViewState,oneOf } from '../viewPreferences';
import { useMemo } from 'react';
import { Card,Empty } from './Field';
import { SortControls } from './SortControls';
import { duration } from '../format';
import type { WorkDay,WorkHoursReport } from '../types';

type Props={report:WorkHoursReport;onExport:(report:WorkHoursReport)=>void};

export function WorkHoursSummary({report,onExport}:Props){
  const days=report?.days??[];
  const [daySort,setDaySort]=useViewState<string>('journey.sort','day',oneOf('day','worked','undefined','regular','extra','precision')),[dayDirection,setDayDirection]=useViewState('journey.direction','asc',oneOf('asc','desc'));
  const sortedDays=useMemo(()=>[...days].sort((a,b)=>compareDay(a,b,daySort,dayDirection)),[days,daySort,dayDirection]);
 const total=days.reduce((sum,day)=>({worked:sum.worked+day.workedSeconds,undefined:sum.undefined+day.undefinedSeconds,regular:sum.regular+day.regularSeconds,extra:sum.extra+day.extraSeconds}),{worked:0,undefined:0,regular:0,extra:0});
 return <Card title="Jornada e extra-time" actions={<button className="button" onClick={()=>onExport({days:sortedDays,undefinedPeriods:report.undefinedPeriods})} disabled={!days.length}>Exportar resumo CSV</button>}>
  <p className="muted">“A definir” conta como trabalho; extra-time começa após a meta da jornada vigente no dia. Dias anteriores às novas regras mantêm o cálculo histórico de 8h. Configure jornadas e exceções em Configurações.</p>
  {!days.length?<Empty>Nenhuma jornada encontrada no período selecionado.</Empty>:<>
   <SortControls label="Ordenar dias por" directionLabel="Direção dos dias" value={daySort} options={[{value:'day',label:'Data'},{value:'worked',label:'Total trabalhado'},{value:'undefined',label:'A definir'},{value:'regular',label:'Horas normais'},{value:'extra',label:'Extra-time'},{value:'precision',label:'Precisão'}]} direction={dayDirection} onValue={setDaySort} onDirection={setDayDirection}/>
   <div className="table-scroll"><table><thead><tr>{['Data','Trabalhado','A definir','Normal','Extra-time','Meta','Precisão'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>
    {sortedDays.map(day=><tr key={day.day}><td>{new Date(`${day.day}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="numeric">{duration(day.workedSeconds)}</td><td className="numeric">{duration(day.undefinedSeconds)}</td><td className="numeric">{duration(day.regularSeconds)}</td><td className="numeric">{duration(day.extraSeconds)}</td><td className="numeric" title={day.scheduleSource}>{duration(day.targetSeconds??28800)}</td><td>{day.estimated?'Estimado':'Preciso'}</td></tr>)}
    <tr><th>Total</th><th className="numeric">{duration(total.worked)}</th><th className="numeric">{duration(total.undefined)}</th><th className="numeric">{duration(total.regular)}</th><th className="numeric">{duration(total.extra)}</th><th>—</th><th>—</th></tr>
   </tbody></table></div>
  </>}
 </Card>;
}

function compareDay(a:WorkDay,b:WorkDay,sort:string,direction:'asc'|'desc'){
 const sign=direction==='asc'?1:-1;
 const left=sort==='worked'?a.workedSeconds:sort==='undefined'?a.undefinedSeconds:sort==='regular'?a.regularSeconds:sort==='extra'?a.extraSeconds:sort==='precision'?Number(a.estimated):a.day;
 const right=sort==='worked'?b.workedSeconds:sort==='undefined'?b.undefinedSeconds:sort==='regular'?b.regularSeconds:sort==='extra'?b.extraSeconds:sort==='precision'?Number(b.estimated):b.day;
 return (typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'pt-BR'))*sign||a.day.localeCompare(b.day);
}
