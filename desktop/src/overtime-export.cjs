async function saveOvertime({fetch,dialog,writeFile,port,token},body){
  const response=await fetch(`http://127.0.0.1:${port}/api/overtime/export`,{method:'POST',headers:{'X-Foco-Token':token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok){
    const content=await response.text();let message=content;
    try{message=JSON.parse(content).error||content;}catch{}
    throw new Error(message||`Backend: HTTP ${response.status}`);
  }
  const workbook=Buffer.from(await response.arrayBuffer());
  const picked=await dialog.showSaveDialog({title:'Exportar horas extras',defaultPath:'horas-extras.xlsx',filters:[{name:'Planilha Excel',extensions:['xlsx']}]});
  if(picked.canceled||!picked.filePath)return null;
  writeFile(picked.filePath,workbook);return picked.filePath;
}
module.exports={saveOvertime};
