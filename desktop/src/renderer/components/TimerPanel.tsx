import { clock } from '../format';
import { Card } from './Field';
import type { Session } from '../types';

export function TimerPanel({session,elapsed,running,canStart,onToggle,onFinish,onOverlay}:{session:Session|null;elapsed:number;running:boolean;canStart:boolean;onToggle:()=>void;onFinish:()=>void;onOverlay:()=>void}){
  const total=session?.plannedSeconds||0,progress=total?Math.min(100,elapsed/total*100):0;
  return <Card title="Sessão atual" actions={<button className="button button--quiet" onClick={onOverlay}>Mostrar sobreposição</button>}>
    <p className="eyebrow" aria-live="polite">{!session?'PRONTO PARA COMEÇAR':running?'EM FOCO':session.status.toUpperCase()}</p>
    <div className="timer" aria-live="off">{clock(total?Math.max(0,total-elapsed):elapsed)}</div>
    <div className="progress" role="progressbar" aria-label="Progresso do foco" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${progress}%`}}/></div>
    <div className="actions actions--center"><button className="button button--primary" onClick={onToggle} disabled={!session&&!canStart}>{!session?'Iniciar foco':running?'Pausar':'Retomar'}</button><button className="button" onClick={onFinish} disabled={!session}>Encerrar</button></div>
    {session&&<p className="muted timer__activity">{session.client||'Sem cliente'} · {session.project||'Sem projeto'} · {session.activity}</p>}
  </Card>;
}
