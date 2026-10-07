const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell, screen, globalShortcut, Notification } = require('electron');
const { createLocalWorkflow, dayOf } = require('./local-workflow.cjs');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

app.setName('foco-java');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  let mainWindow, overlayWindow, tray, backend, port=Number(process.env.FOCO_PORT||8765), elapsed=0, running=false, activity='';
  const token=randomBytes(32).toString('hex');
  const dataDirectory=process.env.FOCO_DATA_DIR||path.join(app.getPath('appData'),'foco-java','data');
  const logDirectory=path.join(app.getPath('userData'),'logs');
  const logFile=path.join(logDirectory,'errors.log');
  function logError(error,context){try{fs.mkdirSync(logDirectory,{recursive:true});fs.appendFileSync(logFile,JSON.stringify({at:new Date().toISOString(),context,error:String(error?.stack||error)})+'\n','utf8');}catch(logFailure){console.error('Could not write local error log',logFailure);}}
  const packaged=app.isPackaged;
  const preload=path.join(__dirname,'preload.cjs');
  const renderer=path.join(__dirname,'renderer');
  const icon=path.join(process.resourcesPath,'Foco.ico');
  const devUrl='http://127.0.0.1:5173';
  const url=path.join(renderer,'index.html');
  const overlayUrl=path.join(renderer,'overlay.html');
  let workflow,workflowTimer,pendingNavigation;
  function navigateToday(tab){
    if(!mainWindow||mainWindow.isDestroyed())return;
    if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();
    pendingNavigation={tab,day:dayOf(new Date())};
    mainWindow.webContents.send('foco:navigate-today',pendingNavigation);
  }
  function startWorkflow(settings){
    fs.mkdirSync(dataDirectory,{recursive:true});
    const stateFile=path.join(dataDirectory,'workflow-reminders.json');
    workflow=createLocalWorkflow({globalShortcut,Notification,onNavigate:navigateToday,
      onChanged:state=>mainWindow?.webContents.send('foco:workflow-status',state),onError:error=>logError(error,'local-workflow'),
      loadState:()=>fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):null,
      saveState:state=>{fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state),'utf8');fs.renameSync(stateFile+'.tmp',stateFile);}});
    workflow.configure(settings);workflowTimer=setInterval(()=>workflow.tick(),15000);
  }
  const freePort=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
  const ping=async()=>{try{return(await fetch(`http://127.0.0.1:${port}/api/health`)).ok;}catch{return false;}};
  async function startBackend(){
    if(process.env.FOCO_BACKEND_URL){port=Number(new URL(process.env.FOCO_BACKEND_URL).port||8765);return;}
    if(packaged)port=await freePort();
    fs.mkdirSync(dataDirectory,{recursive:true});
    const jar=packaged?path.join(process.resourcesPath,'backend','foco-backend.jar'):path.resolve(__dirname,'..','..','backend','target','foco-backend.jar');
    backend=spawn(process.env.FOCO_JAVA||'java',['-jar',jar,`--server.port=${port}`],{env:{...process.env,FOCO_DATA_DIR:dataDirectory,FOCO_PORT:String(port),FOCO_API_TOKEN:token},windowsHide:true,stdio:['ignore','pipe','pipe']});
    const recordBackendOutput=(stream,chunk)=>{const output=chunk.toString();console.error('[Spring]',output);if(/ERROR|Exception|Caused by:/.test(output))logError(output,'spring-'+stream);};
    backend.stdout.on('data',chunk=>recordBackendOutput('stdout',chunk));
    backend.stderr.on('data',chunk=>recordBackendOutput('stderr',chunk));
    backend.on('error',error=>{logError(error,'spring-process');dialog.showErrorBox('Foco · Java necessário',`Instale Java 17 ou superior ou configure FOCO_JAVA.\n${error.message}`);});
    const limit=Date.now()+30000;while(Date.now()<limit){if(backend.exitCode!==null)throw new Error('O backend Spring encerrou durante a inicialização.');if(await ping())return;await new Promise(r=>setTimeout(r,200));}
    throw new Error('O backend Spring não respondeu em 30 segundos.');
  }
  function createMain(){
    mainWindow=new BrowserWindow({width:1320,height:900,minWidth:800,minHeight:620,show:false,icon,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});
    (packaged?mainWindow.loadFile(url):mainWindow.loadURL(devUrl)).catch(error=>dialog.showErrorBox('Interface não carregada',String(error)));mainWindow.once('ready-to-show',()=>mainWindow.show());
    mainWindow.on('close',event=>{if(!app.isQuitting){event.preventDefault();mainWindow.hide();}});
    mainWindow.webContents.setWindowOpenHandler(({url:target})=>{if(target.startsWith('https://'))shell.openExternal(target);return{action:'deny'};});
  }
  let moveSaveTimer;
  async function createOverlay(){
    if(overlayWindow&&!overlayWindow.isDestroyed()){overlayWindow.show();return;}
    let opacity=1,focusable=true,settings={};try{const response=await fetch(`http://127.0.0.1:${port}/api/settings`,{headers:{'X-Foco-Token':token}});settings=await response.json();const value=Number(settings['overlay.opacity']);if(Number.isFinite(value)&&value>=0.4&&value<=1)opacity=value;focusable=settings['overlay.noActivate']!=='true';}catch{}
    overlayWindow=new BrowserWindow({width:560,height:110,minWidth:400,maxWidth:760,minHeight:90,maxHeight:150,frame:false,transparent:true,resizable:true,alwaysOnTop:true,skipTaskbar:true,show:false,icon,opacity,focusable,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});
    if(settings['overlay.remember']==='true'&&settings['overlay.monitor']){const display=screen.getAllDisplays().find(item=>String(item.id)===settings['overlay.monitor']);if(display){const x=display.workArea.x+(Number(settings['overlay.left'])||0),y=display.workArea.y+(Number(settings['overlay.top'])||0);overlayWindow.setPosition(Math.max(display.workArea.x,Math.min(x,display.workArea.x+display.workArea.width-560)),Math.max(display.workArea.y,Math.min(y,display.workArea.y+display.workArea.height-110)));}}
    overlayWindow.on('moved',()=>{clearTimeout(moveSaveTimer);moveSaveTimer=setTimeout(async()=>{try{const bounds=overlayWindow.getBounds(),display=screen.getDisplayMatching(bounds),response=await fetch(`http://127.0.0.1:${port}/api/settings`,{headers:{'X-Foco-Token':token}}),current=await response.json();if(current['overlay.remember']==='true')await fetch(`http://127.0.0.1:${port}/api/settings`,{method:'PUT',headers:{'X-Foco-Token':token,'Content-Type':'application/json'},body:JSON.stringify({'overlay.monitor':String(display.id),'overlay.left':String(bounds.x-display.workArea.x),'overlay.top':String(bounds.y-display.workArea.y)})});}catch{}},250);});
    (packaged?overlayWindow.loadFile(overlayUrl):overlayWindow.loadURL(`${devUrl}/overlay.html`)).catch(error=>console.error(error));overlayWindow.once('ready-to-show',()=>{overlayWindow.show();overlayWindow.webContents.send('foco:timer',{elapsed,running,activity});});
  }
  function createTray(){
    let image=nativeImage.createFromPath(icon);if(image.isEmpty())image=nativeImage.createEmpty();
    tray=new Tray(image);tray.setToolTip('Foco · Cronômetro');tray.setContextMenu(Menu.buildFromTemplate([
      {label:'Abrir Foco',click:()=>mainWindow.show()},
      {label:'Capturar uma demanda',click:()=>navigateToday('inbox')},
      {label:'Mostrar / ocultar sobreposição',click:()=>overlayWindow?.isVisible()?overlayWindow.hide():createOverlay()},
      {label:'Sair do Foco',click:()=>{app.isQuitting=true;app.quit();}},
    ]));tray.on('double-click',()=>mainWindow.show());
  }
  ipcMain.handle('foco:api',async(_event,request)=>{
    let recorded=false;
    if(typeof request?.path!=='string'||!request.path.startsWith('/api/')||request.path.startsWith('//'))throw new Error('Rota local inválida.');
    try{
      const response=await fetch(`http://127.0.0.1:${port}${request.path}`,{method:request.method||'GET',headers:{'X-Foco-Token':token,'Content-Type':'application/json'},body:request.body===undefined?undefined:JSON.stringify(request.body)});
      const content=await response.text();if(!response.ok){logError(`HTTP ${response.status}: ${content}`,'api '+request.method+' '+request.path);recorded=true;let message=content;try{message=JSON.parse(content).error||content;}catch{}throw new Error(message||`Backend: HTTP ${response.status}`);}
      if(response.headers.get('content-type')?.includes('text/csv'))return{raw:content};const result=content?JSON.parse(content):null;
      if(request.path==='/api/settings'&&request.method==='PUT')workflow?.configure(result);
      if(request.path==='/api/backup/restore'&&request.method==='POST'){
        try{const restored=await fetch(`http://127.0.0.1:${port}/api/settings`,{headers:{'X-Foco-Token':token}});if(restored.ok)workflow?.configure(await restored.json());}catch(error){logError(error,'restore-workflow');}
      }
      return result;
    }catch(error){if(!recorded)logError(error,'api '+request.method+' '+request.path);throw error;}
  });
  ipcMain.handle('foco:app-info',()=>({version:app.getVersion(),channel:packaged?(app.getPath('exe').toLowerCase().includes('stable')?'Stable':'New'):'Desenvolvimento',platform:process.platform,java:process.env.FOCO_JAVA||'java',dataDirectory,logDirectory}));
  ipcMain.handle('foco:workflow-status',()=>workflow?.status()||null);
  ipcMain.handle('foco:workflow-action',(_event,{kind,action})=>workflow?.action(kind,action));
  ipcMain.handle('foco:take-navigation',()=>{const value=pendingNavigation;pendingNavigation=null;return value;});
  ipcMain.handle('foco:open-error-logs',async()=>{fs.mkdirSync(logDirectory,{recursive:true});await shell.openPath(logDirectory);return logDirectory;});
  ipcMain.handle('foco:import-folder',async()=>{const picked=await dialog.showOpenDialog({title:'Pasta de dados V35',properties:['openDirectory']});if(picked.canceled)return null;if(!fs.existsSync(path.join(picked.filePaths[0],'sessions.xml')))throw new Error('A pasta não contém sessions.xml.');return picked.filePaths[0];});
  ipcMain.handle('foco:choose-folder',async()=>{const picked=await dialog.showOpenDialog({title:'Pasta dos backups',properties:['openDirectory','createDirectory']});return picked.canceled?null:picked.filePaths[0];});
  ipcMain.handle('foco:choose-backup',async()=>{const picked=await dialog.showOpenDialog({title:'Conferir backup do Foco',properties:['openFile'],filters:[{name:'Backup ZIP do Foco',extensions:['zip']}]});return picked.canceled?null:picked.filePaths[0];});
  ipcMain.handle('foco:save-csv',async(_event,{fileName,content})=>{if(typeof content!=='string'||content.length>25*1024*1024)throw new Error('Arquivo CSV inválido ou maior que 25 MB.');const picked=await dialog.showSaveDialog({title:'Exportar relatório de horas',defaultPath:fileName,filters:[{name:'Arquivo CSV',extensions:['csv']}]});if(picked.canceled||!picked.filePath)return null;fs.writeFileSync(picked.filePath,content,'utf8');return picked.filePath;});
  ipcMain.handle('foco:save-pdf',async(_event,{fileName})=>{if(typeof fileName!=='string'||fileName.length>120)throw new Error('Nome de arquivo PDF invÃ¡lido.');const picked=await dialog.showSaveDialog({title:'Exportar Dashboard em PDF',defaultPath:fileName,filters:[{name:'Arquivo PDF',extensions:['pdf']}]});if(picked.canceled||!picked.filePath)return null;const pdf=await mainWindow.webContents.printToPDF({printBackground:true,landscape:true,pageSize:'A4',margins:{top:0.45,bottom:0.45,left:0.45,right:0.45}});fs.writeFileSync(picked.filePath,pdf);return picked.filePath;});
  ipcMain.on('foco:overlay:show',createOverlay);ipcMain.on('foco:overlay:close',()=>overlayWindow?.hide());
  ipcMain.on('foco:window:hide',()=>mainWindow?.hide());
  ipcMain.handle('foco:timer:get',()=>({elapsed,running,activity}));
  ipcMain.on('foco:timer:update',(_event,state)=>{elapsed=state.elapsed;running=state.running;activity=state.activity;overlayWindow?.webContents.send('foco:timer',{elapsed,running,activity});});
  app.on('second-instance',()=>{mainWindow?.show();mainWindow?.focus();});
  app.whenReady().then(async()=>{try{await startBackend();createMain();createTray();const response=await fetch(`http://127.0.0.1:${port}/api/settings`,{headers:{'X-Foco-Token':token}});if(!response.ok)throw new Error('Preferências locais indisponíveis.');startWorkflow(await response.json());}catch(error){dialog.showErrorBox('Foco não iniciado',String(error));app.quit();}});
  app.on('before-quit',()=>{app.isQuitting=true;clearInterval(workflowTimer);workflow?.dispose();backend?.kill();});
  app.on('window-all-closed',()=>{if(app.isQuitting)app.quit();});
}
