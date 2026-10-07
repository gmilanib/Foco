const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foco',{
  workflowStatus:()=>ipcRenderer.invoke('foco:workflow-status'),
  workflowAction:(kind,action)=>ipcRenderer.invoke('foco:workflow-action',{kind,action}),
  takeNavigation:()=>ipcRenderer.invoke('foco:take-navigation'),
  onNavigateToday:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('foco:navigate-today',listener);return()=>ipcRenderer.removeListener('foco:navigate-today',listener);},
  onWorkflowStatus:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('foco:workflow-status',listener);return()=>ipcRenderer.removeListener('foco:workflow-status',listener);},
  appInfo:()=>ipcRenderer.invoke('foco:app-info'),
  request:(path,method='GET',body)=>ipcRenderer.invoke('foco:api',{path,method,body}),
  importFolder:()=>ipcRenderer.invoke('foco:import-folder'),
  chooseFolder:()=>ipcRenderer.invoke('foco:choose-folder'),
  chooseBackup:()=>ipcRenderer.invoke('foco:choose-backup'),
  openErrorLogs:()=>ipcRenderer.invoke('foco:open-error-logs'),
  saveCsv:(fileName,content)=>ipcRenderer.invoke('foco:save-csv',{fileName,content}),
  savePdf:fileName=>ipcRenderer.invoke('foco:save-pdf',{fileName}),
  showOverlay:()=>ipcRenderer.send('foco:overlay:show'),
  closeOverlay:()=>ipcRenderer.send('foco:overlay:close'),
  hideWindow:()=>ipcRenderer.send('foco:window:hide'),
  updateTimer:state=>ipcRenderer.send('foco:timer:update',state),
  getTimer:()=>ipcRenderer.invoke('foco:timer:get'),
  onTimer:callback=>{const handler=(_event,value)=>callback(value);ipcRenderer.on('foco:timer',handler);return()=>ipcRenderer.removeListener('foco:timer',handler);},
});
