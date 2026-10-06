import { useEffect,useState } from 'react';
import { request,safeMessage } from '../api';
import { Card } from './Field';

export function LocalDiagnostics(){
 const [info,setInfo]=useState<Awaited<ReturnType<typeof window.foco.appInfo>>|null>(null),[settings,setSettings]=useState<Record<string,string>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>{setBusy(true);setError('');try{const [i,s]=await Promise.all([window.foco.appInfo(),request<Record<string,string>>('/api/settings')]);setInfo(i);setSettings(s);}catch(e){setError(safeMessage(e));}finally{setBusy(false);}};
 useEffect(()=>{void load();},[]);
 const date=(value?:string)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('pt-BR'):'Sem registro';
 return <Card title="Versão e diagnóstico local">
  {info&&<><p><strong>{info.channel} · {info.version}</strong></p><dl className="local-diagnostics"><dt>Plataforma</dt><dd>{info.platform}</dd><dt>Java configurado</dt><dd>{info.java}</dd><dt>Pasta de dados</dt><dd>{info.dataDirectory}</dd><dt>Pasta de logs</dt><dd>{info.logDirectory}</dd></dl></>}
  <p>Última tentativa de backup: {date(settings['backup.lastAttemptAt'])}</p>
  <p>Resultado: {settings['backup.lastResult']||'Sem registro'}{settings['backup.lastMessage']?` · ${settings['backup.lastMessage']}`:''}</p>
  <p>Último backup bem-sucedido: {date(settings['backup.lastSuccessAt'])}</p>
  {settings['backup.lastDestination']&&<p className="local-diagnostics">Destino do último sucesso: {settings['backup.lastDestination']}</p>}
  {error&&<p role="alert">{error}</p>}<button className="button" disabled={busy} onClick={()=>void load()}>Atualizar diagnóstico</button>
 </Card>;
}
