import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {OvertimeDialog} from './components/OvertimeDialog';
const download=vi.hoisted(()=>vi.fn().mockResolvedValue(undefined));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const result={lines:[{day:'2026-09-21',seconds:-1800,description:'Abatimento de jornada'}],extraSeconds:3600,deductionSeconds:1800,totalSeconds:1800,warnings:['Confira as folgas.']};
function setup(settings:Record<string,string>={}){
 const request=vi.fn().mockImplementation((path:string)=>Promise.resolve(path==='/api/settings'?settings:result));
 Object.defineProperty(window,'foco',{configurable:true,writable:true,value:{request,saveOvertime:download}});
 render(<OvertimeDialog onClose={()=>{}}/>);return request;
}
it('usa bases independentes e tolerância, exige prévia e salva antes de exportar',async()=>{
 const request=setup();await waitFor(()=>expect(screen.getByRole('button',{name:'Calcular prévia'})).toBeEnabled());
 expect(screen.getByLabelText('Horas para completar a jornada')).toHaveValue('rounded');expect(screen.getByLabelText('Horas extras')).toHaveValue('real');
 expect(screen.getByLabelText('Tolerância diária de falta (minutos)')).toHaveValue(30);expect(screen.getByRole('button',{name:'Baixar XLSX'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));await screen.findByText(/Saldo: 0:30:00/);expect(screen.getByText('Confira as folgas.')).toBeInTheDocument();
 expect(request).toHaveBeenCalledWith('/api/overtime/preview','POST',expect.objectContaining({journeyMode:'rounded',extraMode:'real',toleranceMinutes:30,monthlyAmount:null}));
 fireEvent.click(screen.getByRole('button',{name:'Baixar XLSX'}));await waitFor(()=>expect(download).toHaveBeenCalled());expect(request).toHaveBeenCalledWith('/api/settings','PUT',expect.objectContaining({'overtime.journeyMode':'rounded','overtime.extraMode':'real','overtime.toleranceMinutes':'30'}));
});
it('restaura preferências e invalida prévia quando o cálculo muda',async()=>{
 setup({'overtime.journeyMode':'real','overtime.extraMode':'rounded','overtime.toleranceMinutes':'15'});await waitFor(()=>expect(screen.getByLabelText('Horas extras')).toHaveValue('rounded'));
 fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));await screen.findByText(/Saldo:/);
 fireEvent.change(screen.getByLabelText('Tolerância diária de falta (minutos)'),{target:{value:'20'}});expect(screen.getByRole('button',{name:'Baixar XLSX'})).toBeDisabled();expect(screen.queryByText(/Saldo:/)).not.toBeInTheDocument();
});
it('rejeita datas invertidas e não envia pedido de cálculo',async()=>{
 const request=setup();await waitFor(()=>expect(screen.getByRole('button',{name:'Calcular prévia'})).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Apuração inicial'),{target:{value:'2026-10-21'}});fireEvent.change(screen.getByLabelText('Apuração final'),{target:{value:'2026-09-20'}});fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));expect(await screen.findByRole('alert')).toHaveTextContent('início anterior ou igual ao fim');expect(request).not.toHaveBeenCalledWith('/api/overtime/preview',expect.anything(),expect.anything());
});
it.each([['2026-09-20','2026-10-21'],['2026-12-20','2027-01-21']])('exporta período livre de %s a %s',async(from,to)=>{
 const request=setup();await waitFor(()=>expect(screen.getByRole('button',{name:'Calcular prévia'})).toBeEnabled());
 expect(screen.queryByLabelText('Mês da planilha')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Apuração inicial'),{target:{value:from}});fireEvent.change(screen.getByLabelText('Apuração final'),{target:{value:to}});
 fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));await screen.findByText(/Saldo:/);
 expect(request).toHaveBeenCalledWith('/api/overtime/preview','POST',expect.objectContaining({from,to}));
 fireEvent.click(screen.getByRole('button',{name:'Baixar XLSX'}));await waitFor(()=>expect(download).toHaveBeenCalledWith(expect.objectContaining({from,to})));
});
