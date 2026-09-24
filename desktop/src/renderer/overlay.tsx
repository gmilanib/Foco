import React,{useEffect,useState} from 'react';
import { createRoot } from 'react-dom/client';
import { clock } from './format';
import type { TimerNotice } from './types';
import './styles.css';
import './overlay.css';

function Overlay(){const [state,setState]=useState<TimerNotice>({elapsed:0,running:false,activity:''});useEffect(()=>{document.body.classList.add('overlay-page');void window.foco.getTimer().then(setState);const unsubscribe=window.foco.onTimer(setState);return()=>{unsubscribe();document.body.classList.remove('overlay-page');};},[]);return <main className="overlay"><button className="overlay__close" onClick={()=>window.foco.closeOverlay()} aria-label="Fechar sobreposição">×</button><span className="eyebrow">{state.running?'EM FOCO':'FOCO PAUSADO'}</span><strong>{clock(state.elapsed)}</strong><span>{state.activity||'Nenhuma atividade ativa'}</span><i className={state.running?'is-running':''}/></main>;}
createRoot(document.getElementById('overlay-root')!).render(<React.StrictMode><Overlay/></React.StrictMode>);
