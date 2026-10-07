const kinds=['planning','review'];
const dayOf=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const validShortcut=value=>typeof value==='string'&&/^(?:(?:Control|Ctrl|Alt|Shift|Super)\+){1,4}(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/i.test(value)&&/(?:Control|Ctrl|Alt|Super)\+/i.test(value);

function createLocalWorkflow({globalShortcut,Notification,onNavigate,onChanged=()=>{},loadState=()=>null,saveState=()=>{},now=()=>new Date(),onError=()=>{}}){
 let settings={},registered='',shortcutError='',configured=false,state={day:'',delivered:{},snoozed:{},pending:[],silent:false};
 const notices=new Map();
 try{
  const loaded=loadState();
  if(loaded&&typeof loaded.day==='string'&&loaded.delivered&&loaded.snoozed&&Array.isArray(loaded.pending)){
   state={day:loaded.day,delivered:Object.fromEntries(kinds.map(k=>[k,loaded.delivered[k]===true])),snoozed:Object.fromEntries(kinds.filter(k=>Number.isFinite(loaded.snoozed[k])).map(k=>[k,loaded.snoozed[k]])),pending:loaded.pending.filter(k=>kinds.includes(k)),silent:loaded.silent===true};
  }
 }catch(error){onError(error);}
 const supported=()=>{try{return Notification.isSupported();}catch{return false;}};
 const status=()=>({shortcut:{registered:!!registered,accelerator:registered,error:shortcutError},notificationsSupported:supported(),pending:state.pending.map(kind=>({kind,day:state.day})),silencedToday:state.day===dayOf(now())&&state.silent});
 const closeNotice=kind=>{notices.get(kind)?.close();notices.delete(kind);};
 const changed=()=>{try{saveState(state);}catch(error){onError(error);}onChanged(status());};
 function action(kind,choice){
  if(!kinds.includes(kind)||!['open','snooze','dismiss','silence'].includes(choice))throw new Error('Ação de lembrete inválida.');
  tick();
  if(!state.pending.includes(kind))return status();
  if(choice==='silence'){state.silent=true;state.pending=[];state.snoozed={};for(const k of kinds)closeNotice(k);}
  else{
   state.pending=state.pending.filter(k=>k!==kind);closeNotice(kind);
   if(choice==='snooze')state.snoozed[kind]=now().getTime()+15*60*1000;
   if(choice==='open')onNavigate(kind==='planning'?'today':'review');
  }
  changed();return status();
 }
 function fire(kind){
  state.delivered[kind]=true;delete state.snoozed[kind];state.pending.push(kind);
  if(supported()){
   try{
    const notice=new Notification({title:'Foco · Lembrete local',body:kind==='planning'?'Reserve um momento para planejar o dia. Clique para abrir Hoje.':'Revise seus apontamentos e a próxima ação. Clique para abrir o fechamento do dia.'});
    notice.on('click',()=>action(kind,'open'));notices.set(kind,notice);notice.show();
   }catch(error){onError(error);}
  }
  changed();
 }
 function tick(){
  if(!configured)return;
  const current=now(),day=dayOf(current);
  if(state.day!==day){for(const kind of kinds)closeNotice(kind);state={day,delivered:{},snoozed:{},pending:[],silent:false};changed();}
  if(state.silent)return;
  for(const kind of kinds){
   if(settings[`reminders.${kind}.enabled`]!=='true'||state.pending.includes(kind))continue;
   if(state.snoozed[kind]){if(current.getTime()>=state.snoozed[kind])fire(kind);continue;}
   if(state.delivered[kind])continue;
   const time=settings[`reminders.${kind}.time`]||(kind==='planning'?'09:00':'18:00');
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))continue;
   const scheduled=new Date(current);scheduled.setHours(Number(time.slice(0,2)),Number(time.slice(3)),0,0);
   const delay=current.getTime()-scheduled.getTime();
   if(delay>=0&&delay<=15*60*1000)fire(kind);
  }
 }
 function configure(values){
  settings={...values};configured=true;
  const shortcut=settings['capture.shortcut']||'Ctrl+Alt+Q';
  const desired=settings['capture.enabled']==='true'?shortcut:'';
  if(desired!==registered){
   if(registered)globalShortcut.unregister(registered);registered='';shortcutError='';
   if(desired){
    if(!validShortcut(desired))shortcutError='Atalho inválido. Use, por exemplo, Ctrl+Alt+Q.';
    else try{if(globalShortcut.register(desired,()=>onNavigate('inbox')))registered=desired;else shortcutError='Atalho indisponível ou usado por outro aplicativo. Escolha outra combinação.';}catch{shortcutError='Não foi possível registrar o atalho. Escolha outra combinação.';}
   }
  }else if(!desired)shortcutError='';
  for(const kind of kinds){if(settings[`reminders.${kind}.enabled`]!=='true'){state.pending=state.pending.filter(k=>k!==kind);delete state.snoozed[kind];closeNotice(kind);}}
  tick();changed();return status();
 }
 function dispose(){configured=false;if(registered)globalShortcut.unregister(registered);registered='';for(const kind of kinds)closeNotice(kind);}
 return {configure,tick,status,action,dispose};
}
module.exports={createLocalWorkflow,validShortcut,dayOf};
