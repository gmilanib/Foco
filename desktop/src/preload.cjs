const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foco',{
  request:(path,method='GET',body)=>ipcRenderer.invoke('foco:api',{path,method,body}),
  importFolder:()=>ipcRenderer.invoke('foco:import-folder'),
  chooseFolder:()=>ipcRenderer.invoke('foco:choose-folder'),
  saveCsv:(fileName,content)=>ipcRenderer.invoke('foco:save-csv',{fileName,content}),
  showOverlay:()=>ipcRenderer.send('foco:overlay:show'),
  closeOverlay:()=>ipcRenderer.send('foco:overlay:close'),
  hideWindow:()=>ipcRenderer.send('foco:window:hide'),
  updateTimer:state=>ipcRenderer.send('foco:timer:update',state),
  getTimer:()=>ipcRenderer.invoke('foco:timer:get'),
  onTimer:callback=>{const handler=(_event,value)=>callback(value);ipcRenderer.on('foco:timer',handler);return()=>ipcRenderer.removeListener('foco:timer',handler);},
});
