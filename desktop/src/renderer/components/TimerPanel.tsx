import { clock } from '../format';
import { Play,Pause,Square,Timer } from 'lucide-react';
import { Card } from './Field';
import type { Session } from '../types';

export function TimerPanel({session,elapsed,running,canStart,onToggle,onFinish,onOverlay}:{session:Session|null;elapsed:number;running:boolean;canStart:boolean;onToggle:()=>void;onFinish:()=>void;onOverlay:()=>void}){
  const total=session?.plannedSeconds||0,progress=total?Math.min(100,elapsed/total*100):0;
  return <Card title="Sessão atual" actions={<button className="button button--quiet" onClick={onOverlay}>Mostrar sobreposição</button>}>
    <div className={`timer-orbit ${running?'is-running':''}`} aria-hidden="true"><Timer size={26}/></div>
    <p className="eyebrow" aria-live="polite">{!session?'PRONTO PARA COMEÇAR':running?'EM FOCO':session.status.toUpperCase()}</p>
    <div className="timer" aria-live="off">{clock(total?Math.max(0,total-elapsed):elapsed)}</div>
    <div className="progress" role="progressbar" aria-label="Progresso do foco" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${progress}%`}}/></div>
    <div className="actions actions--center"><button className="button button--primary" onClick={onToggle} disabled={!session&&!canStart}>{running?<Pause size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}{!session?'Iniciar foco':running?'Pausar':'Retomar'}</button><button className="button" onClick={onFinish} disabled={!session}><Square size={14} aria-hidden="true"/>Encerrar</button></div>
    <p className="rounding-hint">Ao encerrar, o foco é arredondado para cima em blocos de 2 minutos.</p>
    {session&&<p className="muted timer__activity">{session.client||'Sem cliente'} · {session.project||'Sem projeto'} · {session.activity}</p>}
  </Card>;
}
