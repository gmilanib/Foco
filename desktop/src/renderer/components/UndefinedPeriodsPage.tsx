import { Card,Empty } from './Field';
import { duration } from '../format';
import type { UndefinedPeriod } from '../types';

export function UndefinedPeriodsPage({periods,onBook,onReview}:{onReview?:(periods:UndefinedPeriod[])=>void;periods:UndefinedPeriod[];onBook:(period:UndefinedPeriod)=>void}){
 return <Card actions={onReview&&periods.length?<button className="button button--primary" onClick={()=>onReview(periods)}>Revisar em sequência</button>:undefined} title={`Lacunas a definir (${periods.length})`}>
  <p className="muted">Transforme cada intervalo em um apontamento, como almoço, planejamento ou atividade de projeto.</p>
  {!periods.length?<Empty>Nenhuma lacuna encontrada no período selecionado.</Empty>:<div className="table-scroll"><table><thead><tr>{['Data','Início','Término','Duração','Ação'].map(title=><th key={title}>{title}</th>)}</tr></thead><tbody>
   {periods.map((period,index)=><tr key={`${period.day}-${period.startAt}-${index}`}>
    <td>{new Date(`${period.day}T12:00:00`).toLocaleDateString('pt-BR')}</td>
    <td>{new Date(period.startAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
    <td>{new Date(period.endAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
    <td className="numeric">{duration(period.seconds)}</td><td><button className="button" onClick={()=>onBook(period)}>Criar apontamento</button></td>
   </tr>)}
  </tbody></table></div>}
 </Card>;
}
