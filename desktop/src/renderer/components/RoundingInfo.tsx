import { useEffect,useState } from 'react';
import { request } from '../api';
import { Card } from './Field';

export function RoundingInfo(){
 const [values,setValues]=useState<Record<string,string>>({});
 useEffect(()=>{void request<Record<string,string>>('/api/settings').then(setValues).catch(()=>{});},[]);
 return <Card title="Arredondamento do foco">
  <p>Ao encerrar ou trocar uma tarefa, o foco é arredondado para cima em blocos de <strong>2 minutos</strong>. Por exemplo: 2min01s se tornam 4min; 4min exatos continuam 4min.</p>
  <p className="muted">O histórico com ajuste recuperável é convertido usando o foco real. Legados sem precisão permanecem com o valor salvo e são identificados nos relatórios. Retroativos e registros sem acréscimo de arredondamento mantêm o tempo informado.</p>
  {values['rounding.migratedSessions']&&<p role="status">{values['rounding.migratedSessions']} apontamento(s) convertido(s) na última atualização do histórico.</p>}
  {values['rounding.safetyBackup']&&<p className="restore-path muted">Cópia anterior à conversão: {values['rounding.safetyBackup']}</p>}
 </Card>;
}
