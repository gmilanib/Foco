import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { WorkHoursSummary } from './components/WorkHoursSummary';
import type { WorkHoursReport } from './types';

const report:WorkHoursReport={days:[{day:'2026-09-22',workedSeconds:32400,undefinedSeconds:3600,regularSeconds:28800,extraSeconds:3600,estimated:true}],undefinedPeriods:[{day:'2026-09-22',startAt:'2026-09-22T10:00:00-03:00',endAt:'2026-09-22T11:00:00-03:00',seconds:3600}]};
afterEach(cleanup);

describe('resumo diário de jornada',()=>{
 it('exibe horas normais e excedentes com precisão histórica',()=>{
  render(<WorkHoursSummary report={report} onExport={vi.fn()}/>);
  expect(screen.getByText('Jornada e extra-time')).toBeInTheDocument();
  expect(screen.getByText('Estimado')).toBeInTheDocument();
  expect(screen.queryByText('Lacunas “A definir”')).not.toBeInTheDocument();
  expect(screen.queryByText('10:00')).not.toBeInTheDocument();
  expect(screen.getAllByText('1h 00min')[0]).toBeInTheDocument();
 });
 it('desabilita exportação quando o período não tem jornada',()=>{
  const exportReport=vi.fn();render(<WorkHoursSummary report={{days:[],undefinedPeriods:[]}} onExport={exportReport}/>);
  expect(screen.getByText(/Nenhuma jornada encontrada/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Exportar resumo CSV'}));expect(exportReport).not.toHaveBeenCalled();
 });
 it('ordena os dias pela duração escolhida sem mover a linha de total',()=>{
  const report:WorkHoursReport={days:[
   {day:'2026-09-22',workedSeconds:3600,undefinedSeconds:0,regularSeconds:3600,extraSeconds:0,estimated:false},
   {day:'2026-09-23',workedSeconds:7200,undefinedSeconds:0,regularSeconds:7200,extraSeconds:0,estimated:false},
  ],undefinedPeriods:[]};
  const exportReport=vi.fn();
  const {container}=render(<WorkHoursSummary report={report} onExport={exportReport}/>);
  fireEvent.change(screen.getByLabelText('Ordenar dias por'),{target:{value:'worked'}});
  fireEvent.change(screen.getByLabelText('Direção dos dias'),{target:{value:'desc'}});
  const rows=Array.from(container.querySelectorAll('.table-scroll tbody tr'));
  expect(rows[0].textContent).toContain('2h 00min');
  expect(rows[rows.length-1].textContent).toContain('Total');
  fireEvent.click(screen.getByRole('button',{name:'Exportar resumo CSV'}));
  expect(exportReport.mock.calls[0][0].days.map((day:WorkHoursReport['days'][number])=>day.day)).toEqual(['2026-09-23','2026-09-22']);
 });
});
