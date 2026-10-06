import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { ReportPage } from './pages/ReportPage';
import type { Session } from './types';

afterEach(cleanup);
const make=(id:string,activity:string,startAt:string):Session=>({id,taskId:null,client:'ACME',project:'Projeto',activity,details:'',consultant:'',cardReference:'',startAt,endAt:startAt,plannedSeconds:0,focusSeconds:3600,hourlyRate:null,status:'Concluída',category:'Normal'});
const noop=vi.fn();

describe('ordenação dos relatórios de apontamentos',()=>{
 it('ordena por data e permite alternar critério e direção',async()=>{
  const rows=[{...make('old','Zebra','2026-09-01T09:00:00Z'),focusSeconds:3600},{...make('new','Árvore','2026-09-03T09:00:00Z'),focusSeconds:1800},{...make('middle','Bola','2026-09-02T09:00:00Z'),focusSeconds:7200}];
  const exportRows=vi.fn();
  const {container}=render(<ReportPage items={rows} colors={[]} showValues={false} onRefresh={noop} onEdit={noop} onDelete={noop} onBatch={noop} onExport={exportRows}/>);
  const table=container.querySelector('.card:last-child table')!;
  expect(screen.getByLabelText('Ordenar sessões por').querySelector('option[value="value"]')).toBeNull();
  const activities=()=>Array.from(table.querySelectorAll('tbody tr')).map(row=>row.children[4].textContent);
  expect(activities()).toEqual(['Árvore','Bola','Zebra']);
  fireEvent.change(screen.getByLabelText('Ordenar sessões por'),{target:{value:'activity'}});
  fireEvent.change(screen.getByLabelText('Direção').closest('label')!.querySelector('select')!,{target:{value:'asc'}});
  expect(activities()).toEqual(['Árvore','Bola','Zebra']);
  fireEvent.change(screen.getByLabelText('Ordenar sessões por'),{target:{value:'focus'}});
  fireEvent.change(screen.getByLabelText('Direção').closest('label')!.querySelector('select')!,{target:{value:'desc'}});
  expect(activities()).toEqual(['Bola','Zebra','Árvore']);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));
  expect(exportRows.mock.calls[0][0].map((row:Session)=>row.id)).toEqual(['middle','old','new']);
 });
});

it('permite escolher término real ou arredondado para tabela e exportação',async()=>{
 const row={...make('dual','Teste','2026-09-01T09:00:00Z'),endAt:'2026-09-01T10:07:00Z',roundedEndAt:'2026-09-01T10:10:00Z'};
 const exported=vi.fn();
 const {container}=render(<ReportPage items={[row]} colors={[]} showValues={false} onRefresh={noop} onEdit={noop} onDelete={noop} onBatch={noop} onExport={exported}/>);
 const end=()=>container.querySelector('tbody tr')!.children[7].textContent;
 expect(end()).toBe(new Date(row.endAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}));
 fireEvent.change(screen.getByLabelText('Término exibido'),{target:{value:'rounded'}});
 expect(end()).toBe(new Date(row.roundedEndAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));
 expect(exported).toHaveBeenCalledWith([row],'rounded','rounded');
});
