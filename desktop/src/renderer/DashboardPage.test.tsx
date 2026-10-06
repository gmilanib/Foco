import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { DashboardPage } from './pages/DashboardPage';
import { isoDay } from './format';
import type { Dashboard } from './types';

const data:Dashboard={sessions:2,seconds:5400,value:120,unpriced:1,groups:[{parent:null,name:'ACME',client:'ACME',sessions:2,seconds:5400,value:120,unpriced:1}],projects:[{parent:'ACME',name:'Projeto Azul',client:'ACME',sessions:1,seconds:3600,value:120,unpriced:0},{parent:'ACME',name:'Projeto Verde',client:'ACME',sessions:1,seconds:1800,value:0,unpriced:1}]};
afterEach(cleanup);

describe('dashboard',()=>{
 it('troca a base das horas e identifica o modo aplicado no painel e no PDF',async()=>{
  const refresh=vi.fn().mockResolvedValue(true);
  render(<DashboardPage data={data} colors={[]} showValues onRefresh={refresh} onExportPdf={vi.fn()}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeEnabled());
  expect(screen.getByLabelText('Horas exibidas')).toHaveValue('rounded');
  expect(refresh).toHaveBeenCalledWith(expect.objectContaining({hoursMode:'rounded'}));
  fireEvent.change(screen.getByLabelText('Horas exibidas'),{target:{value:'real'}});
  expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeDisabled();
  expect(screen.getByText('Horas exibidas: Arredondadas')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Horas reais'})).toBeInTheDocument());
  expect(screen.getByText('Horas exibidas: Reais')).toBeInTheDocument();
  expect(refresh).toHaveBeenLastCalledWith(expect.objectContaining({hoursMode:'real'}));
  expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeEnabled();
 });
 it('mantém modo aplicado e bloqueia PDF se a atualização do modo falhar',async()=>{
  const refresh=vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
  render(<DashboardPage data={data} colors={[]} showValues={false} onRefresh={refresh} onExportPdf={vi.fn()}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Horas exibidas'),{target:{value:'real'}});
  fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
  await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('heading',{name:'Horas arredondadas'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeDisabled();
 });
 it('abre no dia local de hoje e consulta os dados automaticamente',async()=>{
  const onRefresh=vi.fn();
  render(<DashboardPage data={null} colors={[]} showValues={false} onRefresh={onRefresh} onExportPdf={vi.fn()}/>);
  const today=isoDay(new Date());
  expect((screen.getByLabelText('Data inicial') as HTMLInputElement).value).toBe(today);
  expect((screen.getByLabelText('Data final') as HTMLInputElement).value).toBe(today);
  await waitFor(()=>expect(onRefresh).toHaveBeenCalledWith(expect.objectContaining({from:today,to:today})));
 });
 it('mantém subtotais de projeto recolhidos e expande apenas o grupo escolhido',()=>{
  render(<DashboardPage data={data} colors={[]} showValues onRefresh={vi.fn()} onExportPdf={vi.fn()}/>);
  expect(screen.queryByText('Projeto Azul')).toBeNull();
  fireEvent.click(screen.getAllByRole('button',{name:/ACME/})[0]);
  expect(screen.getAllByText('Projeto Azul')).toHaveLength(2);
  expect(screen.getAllByText('Projeto Verde')).toHaveLength(2);
  expect(screen.getAllByText('1h 00min').length).toBeGreaterThan(0);
 });
 it('aplica cores de cliente configuradas nos gráficos',()=>{
  const {container}=render(<DashboardPage data={data} colors={[{client:'ACME',hex:'#123456'}]} showValues onRefresh={vi.fn()} onExportPdf={vi.fn()}/>);
  expect(container.querySelector('.legend i')?.getAttribute('style')).toContain('#123456');
  expect(container.querySelector('.client-marker')?.getAttribute('style')).toContain('#123456');
 });
 it('não atribui uma cor de cliente ao projeto compartilhado',()=>{
  const mixed:Dashboard={...data,groups:[{...data.groups[0],name:'ACME',client:null}],projects:[]};
  const {container}=render(<DashboardPage data={mixed} colors={[{client:'ACME',hex:'#123456'}]} showValues={false} onRefresh={vi.fn()} onExportPdf={vi.fn()}/>);
  expect(container.querySelector('.client-marker')).toBeNull();
  expect(container.querySelector('.bar-track span')?.getAttribute('style')).not.toContain('#123456');
 });
 it('exporta o agrupamento e o estado atual, com opção de ocultar valores',async()=>{
  const exportPdf=vi.fn();render(<DashboardPage data={data} colors={[]} showValues onRefresh={vi.fn()} onExportPdf={exportPdf}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Exportar PDF'}));expect(exportPdf).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole('checkbox',{name:/Incluir valores financeiros no PDF/}));
  fireEvent.click(screen.getByRole('button',{name:'Exportar PDF'}));
  expect(exportPdf).toHaveBeenCalledWith(true);
 });
 it('ordena grupos do dashboard pelo critério e direção selecionados',()=>{
  const many:Dashboard={...data,groups:[{...data.groups[0],name:'Zeta',seconds:3600},{...data.groups[0],name:'Alfa',seconds:1800}],projects:[]};
  render(<DashboardPage data={many} colors={[]} showValues={false} onRefresh={vi.fn()} onExportPdf={vi.fn()}/>);
  const names=()=>screen.getAllByText(/Zeta|Alfa/).map(node=>node.textContent?.trim());
  fireEvent.change(screen.getByLabelText('Ordenar grupos e projetos por'),{target:{value:'name'}});
  fireEvent.change(screen.getByLabelText('Direção').closest('label')!.querySelector('select')!,{target:{value:'asc'}});
  expect(names()[0]).toBe('Alfa');
  fireEvent.change(screen.getByLabelText('Direção').closest('label')!.querySelector('select')!,{target:{value:'desc'}});
  expect(names()[0]).toBe('Zeta');
 });
 it('bloqueia a exportação sem dados e respeita privacidade financeira',()=>{
  const exportPdf=vi.fn();render(<DashboardPage data={null} colors={[]} showValues={false} onRefresh={vi.fn()} onExportPdf={exportPdf}/>);
  expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeDisabled();
  expect(screen.getByRole('checkbox',{name:/Incluir valores financeiros no PDF/})).toBeDisabled();
  expect(exportPdf).not.toHaveBeenCalled();
 });
 it('exige atualizar antes de exportar alterações de filtro ainda não aplicadas',async()=>{
  const refresh=vi.fn().mockResolvedValue(true);render(<DashboardPage data={data} colors={[]} showValues onRefresh={refresh} onExportPdf={vi.fn()}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Agrupar por'),{target:{value:'project'}});
  expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeEnabled());
 });
});
