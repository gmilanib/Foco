const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foco',{
  appInfo:()=>ipcRenderer.invoke('foco:app-info'),
  request:(path,method='GET',body)=>ipcRenderer.invoke('foco:api',{path,method,body}),
  importFolder:()=>ipcRenderer.invoke('foco:import-folder'),
  chooseFolder:()=>ipcRenderer.invoke('foco:choose-folder'),
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
