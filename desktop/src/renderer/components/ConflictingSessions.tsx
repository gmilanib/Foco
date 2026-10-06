import { localDate } from '../format';
import type { Session } from '../types';

export function ConflictingSessions({sessions}:{sessions:Session[]}){
 if(!sessions.length)return null;
 const ordered=[...sessions].sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
 return <section aria-label="Lançamentos conflitantes">
  <h3>Lançamentos conflitantes ({sessions.length})</h3>
  <div className="table-scroll"><table aria-label="Lançamentos conflitantes">
   <thead><tr>{['Atividade / detalhamento','Cliente / projeto','Início','Término','Estado'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
   <tbody>{ordered.map(session=><tr key={session.id}>
    <td><strong>{session.activity}</strong>{session.details&&<div>{session.details}</div>}</td>
    <td>{session.client||'Sem cliente'}<div>{session.project||'Sem projeto'}</div></td>
    <td>{localDate(session.startAt)}</td>
    <td>{session.endAt?localDate(session.endAt):'Sem término registrado'}</td>
    <td>{session.status}</td>
   </tr>)}</tbody>
  </table></div>
 </section>;
}
