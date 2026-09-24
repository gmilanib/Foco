import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { describe,expect,it,vi } from 'vitest';
import { DashboardPage } from './pages/DashboardPage';
import { isoDay } from './format';
import type { Dashboard } from './types';

const data:Dashboard={sessions:2,seconds:5400,value:120,unpriced:1,groups:[{parent:null,name:'ACME',client:'ACME',sessions:2,seconds:5400,value:120,unpriced:1}],projects:[{parent:'ACME',name:'Projeto Azul',client:'ACME',sessions:1,seconds:3600,value:120,unpriced:0},{parent:'ACME',name:'Projeto Verde',client:'ACME',sessions:1,seconds:1800,value:0,unpriced:1}]};

describe('dashboard',()=>{
 it('abre no dia local de hoje e consulta os dados automaticamente',async()=>{
  const onRefresh=vi.fn();
  render(<DashboardPage data={null} colors={[]} showValues={false} onRefresh={onRefresh}/>);
  const today=isoDay(new Date());
  expect((screen.getByLabelText('Data inicial') as HTMLInputElement).value).toBe(today);
  expect((screen.getByLabelText('Data final') as HTMLInputElement).value).toBe(today);
  await waitFor(()=>expect(onRefresh).toHaveBeenCalledWith(expect.objectContaining({from:today,to:today})));
 });
 it('mantém subtotais de projeto recolhidos e expande apenas o grupo escolhido',()=>{
  render(<DashboardPage data={data} colors={[]} showValues onRefresh={vi.fn()}/>);
  expect(screen.queryByText('Projeto Azul')).toBeNull();
  fireEvent.click(screen.getAllByRole('button',{name:/ACME/})[0]);
  expect(screen.getAllByText('Projeto Azul')).toHaveLength(2);
  expect(screen.getAllByText('Projeto Verde')).toHaveLength(2);
  expect(screen.getAllByText('1h 00min').length).toBeGreaterThan(0);
 });
 it('aplica cores de cliente configuradas nos gráficos',()=>{
  const {container}=render(<DashboardPage data={data} colors={[{client:'ACME',hex:'#123456'}]} showValues onRefresh={vi.fn()}/>);
  expect(container.querySelector('.legend i')?.getAttribute('style')).toContain('#123456');
  expect(container.querySelector('.client-marker')?.getAttribute('style')).toContain('#123456');
 });
 it('não atribui uma cor de cliente ao projeto compartilhado',()=>{
  const mixed:Dashboard={...data,groups:[{...data.groups[0],name:'ACME',client:null}],projects:[]};
  const {container}=render(<DashboardPage data={mixed} colors={[{client:'ACME',hex:'#123456'}]} showValues={false} onRefresh={vi.fn()}/>);
  expect(container.querySelector('.client-marker')).toBeNull();
  expect(container.querySelector('.bar-track span')?.getAttribute('style')).not.toContain('#123456');
 });
});
