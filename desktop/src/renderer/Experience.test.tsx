import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { RoundingInfo } from './components/RoundingInfo';
import { ReportPage } from './pages/ReportPage';
import type { Session } from './types';

afterEach(cleanup);
beforeEach(()=>{vi.mocked(window.foco.request).mockReset();vi.mocked(window.foco.request).mockImplementation(async()=>[] as never);});
it('explica os blocos de 2 minutos e identifica a cópia anterior ao histórico convertido',async()=>{
 vi.mocked(window.foco.request).mockResolvedValue({'rounding.migratedSessions':'12','rounding.safetyBackup':'C:/Backups/anterior.zip'} as never);
 render(<RoundingInfo/>);
 expect(await screen.findByRole('status')).toHaveTextContent('12 apontamento(s)');
 expect(screen.getByText(/Cópia anterior/)).toHaveTextContent('C:/Backups/anterior.zip');
 expect(screen.getByText(/Por exemplo/)).toHaveTextContent('2min01s se tornam 4min');
});
it('mantém a explicação disponível mesmo quando as informações da migração falham',async()=>{
 vi.mocked(window.foco.request).mockRejectedValue(new Error('Falha local'));
 render(<RoundingInfo/>);
 expect(screen.getByRole('heading',{name:'Arredondamento do foco'})).toBeInTheDocument();
 expect(screen.getByText(/Legados sem precisão/)).toBeInTheDocument();
});
it('identifica o legado na linha do relatório e preserva o tempo salvo nas duas bases',()=>{
 const legacy:Session={id:'legacy',taskId:null,client:'ACME',project:'Portal',activity:'Legado',details:'',consultant:'',cardReference:'',startAt:'2026-10-06T09:00:00Z',endAt:'2026-10-06T09:15:00Z',roundedEndAt:null,plannedSeconds:0,focusSeconds:300,hourlyRate:null,status:'Encerrada',category:'Normal'};
 const precise:Session={...legacy,id:'precise',activity:'Recuperado',focusSeconds:480,roundedEndAt:'2026-10-06T09:16:00Z'};
 const noop=vi.fn();
 render(<ReportPage items={[legacy,precise]} colors={[]} showValues={false} onRefresh={noop} onEdit={noop} onDelete={noop} onBatch={noop} onExport={noop}/>);
 expect(screen.getAllByText('Legado · precisão indisponível')).toHaveLength(1);
 expect(screen.getByText(/1 registro\(s\) histórico\(s\) sem precisão/)).toBeInTheDocument();
});
