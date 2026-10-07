import { Card } from './Field';
import { duration } from '../format';
import { focusSeconds,hasUnknownPrecision } from '../hoursBasis';
import type { HoursComparison as Comparison,Session } from '../types';

export function compareSessions(rows:Session[]):Comparison {
 const realSeconds=rows.reduce((sum,row)=>sum+focusSeconds(row,'real'),0);
 const roundedSeconds=rows.reduce((sum,row)=>sum+row.focusSeconds,0);
 return {realSeconds,roundedSeconds,differenceSeconds:Math.max(0,roundedSeconds-realSeconds),
  unknownPrecision:rows.filter(hasUnknownPrecision).length,
  ongoingSessions:rows.filter(row=>!row.virtual&&['Em andamento','Pausada'].includes(row.status)).length};
}
export function HoursComparison({value}:{value:Comparison}){
 return <Card title="Comparação de horas"><dl className="hours-comparison"><div><dt>Reais</dt><dd>{duration(value.realSeconds)}</dd></div><div><dt>Arredondadas</dt><dd>{duration(value.roundedSeconds)}</dd></div><div><dt>Diferença acumulada</dt><dd>{duration(value.differenceSeconds)}</dd></div></dl>
  <p>Mesmos registros e filtros aplicados nas duas bases. A diferença considera somente o acréscimo recuperável, sem incluir pausas.</p>
  <p>{value.unknownPrecision} registro(s) histórico(s) sem precisão recuperável: o tempo salvo é mantido nas duas bases; a diferença histórica pode ser maior.</p>
  {value.ongoingSessions>0&&<p>{value.ongoingSessions} apontamento(s) em andamento ou pausado(s): tempos provisórios, sem arredondamento de encerramento.</p>}
 </Card>;
}
