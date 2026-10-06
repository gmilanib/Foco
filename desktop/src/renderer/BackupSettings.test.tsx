import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { BackupSettings } from './components/BackupSettings';
import { request } from './api';
vi.mock('./api',()=>({request:vi.fn()}));
const change=vi.fn();
afterEach(cleanup);
beforeEach(()=>{
 vi.clearAllMocks();change.mockResolvedValue(undefined);
 vi.mocked(request).mockResolvedValue({'backup.destination':'C:/copies','backup.intervalMinutes':'60'});
 window.foco.chooseFolder=vi.fn().mockResolvedValue('D:/backup');
});
it('loads preferences and saves folder and interval',async()=>{
 render(<BackupSettings onChange={change}/>);
 await screen.findByDisplayValue('C:/copies');
 fireEvent.click(screen.getByText('Escolher pasta de backup'));
 await waitFor(()=>expect(change).toHaveBeenCalledWith({'backup.destination':'D:/backup'}));
 fireEvent.change(screen.getByLabelText('Intervalo de backup (minutos)'),{target:{value:'120'}});
 fireEvent.click(screen.getByText('Salvar intervalo'));
 await waitFor(()=>expect(change).toHaveBeenCalledWith({'backup.intervalMinutes':'120'}));
});
it('creates manual backup and reports errors',async()=>{
 render(<BackupSettings onChange={change}/>);await screen.findByDisplayValue('C:/copies');
 vi.mocked(request).mockResolvedValueOnce({path:'C:/copies/manual.zip'});
 fireEvent.click(screen.getByText('Criar backup agora'));
 await screen.findByText('Backup criado: C:/copies/manual.zip');
 expect(request).toHaveBeenLastCalledWith('/api/backup','POST',{directory:'C:/copies',manual:true});
 vi.mocked(request).mockRejectedValueOnce(new Error('Sem permissão'));
 fireEvent.click(screen.getByText('Criar backup agora'));await screen.findByText('Sem permissão');
});
it('rejects invalid interval and does not save canceled or failed folder selection',async()=>{
 render(<BackupSettings onChange={change}/>);await screen.findByDisplayValue('C:/copies');
 fireEvent.change(screen.getByLabelText('Intervalo de backup (minutos)'),{target:{value:'0'}});
 fireEvent.click(screen.getByText('Salvar intervalo'));
 await screen.findByText('Informe um intervalo inteiro entre 1 e 525600 minutos.');expect(change).not.toHaveBeenCalled();
 vi.mocked(window.foco.chooseFolder).mockResolvedValueOnce(null);
 fireEvent.click(screen.getByText('Escolher pasta de backup'));
 await waitFor(()=>expect(screen.getByText('Escolher pasta de backup')).toBeEnabled());expect(change).not.toHaveBeenCalled();
 change.mockRejectedValueOnce(new Error('Falha ao salvar'));
 fireEvent.click(screen.getByText('Escolher pasta de backup'));await screen.findByText('Falha ao salvar');
 expect(screen.getByDisplayValue('C:/copies')).toBeInTheDocument();
});
