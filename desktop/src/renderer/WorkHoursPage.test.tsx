import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { WorkHoursPage } from './pages/WorkHoursPage';
import { isoDay } from './format';
import type { WorkHoursReport } from './types';

afterEach(cleanup);
const empty:WorkHoursReport={days:[],undefinedPeriods:[]};

describe('tela Jornada',()=>{
 it('abre a data da revisão diretamente em A definir',()=>{
  const refresh=vi.fn();
  render(<WorkHoursPage initialDay="2026-09-28" initialUndefined report={empty} onRefresh={refresh} onExport={vi.fn()} onBook={vi.fn()}/>);
  expect(screen.getByLabelText('Data inicial')).toHaveValue('2026-09-28');
  expect(screen.getByRole('tab',{name:'A definir (0)'})).toHaveAttribute('aria-selected','true');
  expect(refresh).toHaveBeenCalledWith({from:'2026-09-28',to:'2026-09-28'});
 });
 it('consulta automaticamente o dia local atual',async()=>{
  const refresh=vi.fn();
  render(<WorkHoursPage report={empty} onRefresh={refresh} onExport={vi.fn()} onBook={vi.fn()}/>);
  const today=isoDay(new Date());
  expect(screen.getByRole('heading',{name:'Jornada'})).toBeInTheDocument();
  expect(screen.getByLabelText('Data inicial')).toHaveValue(today);
  expect(screen.getByLabelText('Data final')).toHaveValue(today);
  await waitFor(()=>expect(refresh).toHaveBeenCalledWith({from:today,to:today}));
 });
 it('aplica um intervalo independente e permite consultar todo o período',async()=>{
  const refresh=vi.fn();
  render(<WorkHoursPage report={empty} onRefresh={refresh} onExport={vi.fn()} onBook={vi.fn()}/>);
  const from=screen.getByLabelText('Data inicial'),to=screen.getByLabelText('Data final');
  fireEvent.change(from,{target:{value:'2026-09-01'}});
  fireEvent.change(to,{target:{value:'2026-09-15'}});
  fireEvent.click(screen.getByRole('button',{name:'Atualizar jornada'}));
  await waitFor(()=>expect(refresh).toHaveBeenLastCalledWith({from:'2026-09-01',to:'2026-09-15'}));
  fireEvent.click(screen.getByRole('button',{name:'Todo o período'}));
  expect(refresh).toHaveBeenLastCalledWith({from:'',to:''});
 });
 it('separa as lacunas em outra aba e permite iniciar seu lançamento',()=>{
  const period={day:'2026-09-22',startAt:'2026-09-22T10:00:00-03:00',endAt:'2026-09-22T11:00:00-03:00',seconds:3600};
  const onBook=vi.fn();render(<WorkHoursPage report={{...empty,undefinedPeriods:[period]}} onRefresh={vi.fn()} onExport={vi.fn()} onBook={onBook}/>);
  fireEvent.click(screen.getByRole('tab',{name:'A definir (1)'}));
  fireEvent.click(screen.getByRole('button',{name:'Criar apontamento'}));
  expect(onBook).toHaveBeenCalledWith(period);
 });
});
