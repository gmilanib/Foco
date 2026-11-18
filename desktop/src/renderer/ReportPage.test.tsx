import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { ReportPage } from './pages/ReportPage';
import type { Session } from './types';

afterEach(cleanup);
beforeEach(()=>localStorage.clear());
const make=(id:string,activity:string,startAt:string):Session=>({id,taskId:null,client:'ACME',project:'Projeto',activity,details:'',consultant:'',cardReference:'',startAt,endAt:startAt,plannedSeconds:0,focusSeconds:3600,hourlyRate:null,status:'Concluída',category:'Normal'});
const noop=vi.fn();

it('abre a lista simples de atividades a partir do relatório',async()=>{
 render(<ReportPage items={[]} colors={[]} showValues={false} onRefresh={noop} onEdit={noop} onDelete={noop} onBatch={noop} onExport={noop}/>);
 fireEvent.click(screen.getByRole('button',{name:'Lista de atividades'}));
 expect(await screen.findByRole('dialog',{name:'Lista de atividades'})).toBeInTheDocument();
 await screen.findByText('Nenhuma atividade encontrada no período.');
 fireEvent.click(screen.getByRole('button',{name:'Fechar diálogo'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

describe('ordenação dos relatórios de apontamentos',()=>{
 it('ordena instantes com fusos e frações diferentes e exporta na ordem exibida',async()=>{
  const rows=[make('a','Mesmo instante A','2026-10-27T00:30:00Z'),make('b','Mesmo instante B','2026-10-26T21:30:00-03:00'),make('c','Depois','2026-10-26T23:00:00-03:00'),make('d','Fração','2026-10-27T02:00:00.100Z')];
  const exported=vi.fn();
  const {container}=render(<ReportPage items={rows} colors={[]} showValues={false} onRefresh={noop} onEdit={noop} onDelete={noop} onBatch={noop} onExport={exported}/>);
  const activities=()=>Array.from(container.querySelectorAll('tbody tr')).map(row=>row.children[4].textContent);
  expect(activities()).toEqual(['Fração','Depois','Mesmo instante A','Mesmo instante B']);
  fireEvent.change(screen.getByLabelText('Direção'),{target:{value:'asc'}});
  expect(activities()).toEqual(['Mesmo instante A','Mesmo instante B','Depois','Fração']);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));
  expect(exported.mock.calls[0][0].map((row:Session)=>row.id)).toEqual(['a','b','c','d']);
  fireEvent.click(screen.getByLabelText('Selecionar Fração'));
  fireEvent.click(screen.getByLabelText('Selecionar Mesmo instante A'));
  fireEvent.click(screen.getByRole('button',{name:'Exportar CSV (2)'}));
  expect(exported.mock.calls[1][0].map((row:Session)=>row.id)).toEqual(['a','d']);
  fireEvent.change(screen.getByLabelText('Ordenar sessões por'),{target:{value:'client'}});
  expect(activities()).toEqual(['Fração','Depois','Mesmo instante A','Mesmo instante B']);
 });
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
