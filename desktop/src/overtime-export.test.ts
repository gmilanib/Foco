import {expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
const {saveOvertime}=createRequire(import.meta.url)('./overtime-export.cjs');
function setup(){
 const bytes=Uint8Array.from([80,75,3,4,0,255]);
 return {bytes,port:19001,token:'test-token',fetch:vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>bytes.buffer}),dialog:{showSaveDialog:vi.fn().mockResolvedValue({canceled:false,filePath:'report.xlsx'})},writeFile:vi.fn()};
}
it('exports through the authenticated local backend and preserves workbook bytes',async()=>{
 const deps=setup(),body={from:'2026-09-20',to:'2026-10-21'};
 expect(await saveOvertime(deps,body)).toBe('report.xlsx');
 expect(deps.fetch).toHaveBeenCalledWith('http://127.0.0.1:19001/api/overtime/export',{method:'POST',headers:{'X-Foco-Token':'test-token','Content-Type':'application/json'},body:JSON.stringify(body)});
 expect(deps.writeFile).toHaveBeenCalledWith('report.xlsx',Buffer.from(deps.bytes));
});
it('does not write a file when the save dialog is canceled',async()=>{
 const deps=setup();deps.dialog.showSaveDialog.mockResolvedValue({canceled:true});
 expect(await saveOvertime(deps,{})).toBeNull();expect(deps.writeFile).not.toHaveBeenCalled();
});
it('surfaces backend validation without saving an error as a workbook',async()=>{
 const deps=setup();deps.fetch.mockResolvedValue({ok:false,status:400,text:async()=>JSON.stringify({error:'Período inválido'})});
 await expect(saveOvertime(deps,{})).rejects.toThrow('Período inválido');
 expect(deps.dialog.showSaveDialog).not.toHaveBeenCalled();expect(deps.writeFile).not.toHaveBeenCalled();
});
it('surfaces a failed disk write',async()=>{
 const deps=setup();deps.writeFile.mockImplementation(()=>{throw new Error('Disk full');});
 await expect(saveOvertime(deps,{})).rejects.toThrow('Disk full');
});
