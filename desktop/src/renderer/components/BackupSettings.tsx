import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, Field } from './Field';
import { request } from '../api';

export function BackupSettings({onChange}:{onChange:(values:Record<string,string>)=>Promise<void>}) {
 const [folder,setFolder]=useState(''),[interval,setInterval]=useState('1440');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{void request<Record<string,string>>('/api/settings').then(values=>{
  setFolder(values['backup.destination']||'');setInterval(values['backup.intervalMinutes']||'1440');
 }).catch(error=>setMessage(String(error)));},[]);
 const choose=async()=>{
  setBusy(true);
  try{const directory=await window.foco.chooseFolder();if(!directory)return;
   await onChange({'backup.destination':directory});setFolder(directory);setMessage('Pasta de backup salva.');
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar a pasta.');}
  finally{setBusy(false);}
 };
 const save=async()=>{
  const minutes=Number(interval);
  if(!Number.isInteger(minutes)||minutes<1||minutes>525600){setMessage('Informe um intervalo inteiro entre 1 e 525600 minutos.');return;}
  setBusy(true);
  try{await onChange({'backup.intervalMinutes':String(minutes)});setMessage('Intervalo de backup salvo.');}
  catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar o intervalo.');}
  finally{setBusy(false);}
 };
 const create=async()=>{
  setBusy(true);
  try{const result=await request<{path:string}>('/api/backup','POST',{directory:folder,manual:true});setMessage(`Backup criado: ${result.path}`);}
  catch(error){setMessage(error instanceof Error?error.message:'Não foi possível criar o backup.');}
  finally{setBusy(false);}
 };
 return <Card title="Backup"><p>Cria cópias ZIP locais e mantém todas as cópias. O automático funciona enquanto o Foco está aberto e verifica backups pendentes ao iniciar. Um backup manual reinicia o intervalo.</p>
  <Field label="Pasta de backup"><input readOnly value={folder} placeholder="Escolha uma pasta de destino"/></Field>
  <button className="button" disabled={busy} onClick={()=>void choose()}>Escolher pasta de backup</button>
  <Field label="Intervalo de backup (minutos)"><input type="number" min="1" max="525600" step="1" value={interval} onChange={event=>setInterval(event.target.value)}/></Field>
  <p className="muted">60 minutos = 1 hora; 1440 minutos = 24 horas. Verificação a cada minuto.</p>
  <div className="actions"><button className="button" disabled={busy} onClick={()=>void save()}>Salvar intervalo</button>
   <button className="button button--primary" disabled={busy||!folder} onClick={()=>void create()}><Download size={16}/> Criar backup agora</button></div>
  {message&&<p role="status" className="message">{message}</p>}
 </Card>;
}
