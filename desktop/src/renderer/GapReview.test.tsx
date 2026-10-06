import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { GapReviewDialog } from './components/GapReviewDialog';
import type { Draft } from './pages/FocusPage';
import type { UndefinedPeriod } from './types';

afterEach(cleanup);
const periods:UndefinedPeriod[]=[{day:'2026-10-01',startAt:'2026-10-01T12:00:20.123Z',endAt:'2026-10-01T13:00:20.123Z',seconds:3600},{day:'2026-10-01',startAt:'2026-10-01T14:00:00Z',endAt:'2026-10-01T15:00:00Z',seconds:3600}];
const initial:Draft={client:'',project:'',activity:'',details:'',consultant:'',cardReference:'',hourlyRate:'',category:'Normal',mode:'Cronômetro',minutes:25};
const props={periods,initial,history:[],tasks:[],catalogs:{items:{clients:['ACME'],projects:[],activities:['Revisão']},possibleDuplicates:[]},colors:[],defaultRate:'',showValues:false,onClose:vi.fn(),onChanged:vi.fn().mockResolvedValue(undefined)};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(window.foco.request).mockImplementation(async(_path,method)=>method==='POST'?{}:{days:[],undefinedPeriods:periods});});

it('navega sem gravar e reaproveita somente a classificação após salvar explicitamente',async()=>{
 render(<GapReviewDialog {...props}/>);
 expect(screen.getByRole('button',{name:'Anterior'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Próxima'}));expect(screen.getByText(/Revisar lacuna 2 de 2/)).toBeInTheDocument();
 expect(window.foco.request).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Anterior'}));
 fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Revisão'}});fireEvent.change(screen.getByLabelText('Cliente'),{target:{value:'ACME'}});
 fireEvent.click(screen.getByLabelText('Reaproveitar a classificação do último lançamento salvo'));
 fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
 await waitFor(()=>expect(screen.getByText(/Revisar lacuna 1 de 1/)).toBeInTheDocument());
 expect(screen.getByLabelText('Atividade *')).toHaveValue('Revisão');expect(screen.getByLabelText('Cliente')).toHaveValue('ACME');
 const writes=vi.mocked(window.foco.request).mock.calls.filter(c=>c[1]==='POST');expect(writes).toHaveLength(1);
 expect(writes[0]).toEqual(['/api/sessions/retroactive/gap','POST',expect.objectContaining({startAt:periods[0].startAt,endAt:periods[0].endAt,focusMinutes:60})]);
 expect(new Date((screen.getByLabelText('Início *') as HTMLInputElement).value).toISOString()).toBe(periods[1].startAt.replace('00Z','00.000Z'));
 expect(props.onChanged).toHaveBeenCalledTimes(1);
});

it('mantém lacuna e campos após falha de gravação',async()=>{
 vi.mocked(window.foco.request).mockImplementation(async(_path,method)=>{if(method==='POST')throw new Error('Falha ao salvar');return {days:[],undefinedPeriods:periods};});
 render(<GapReviewDialog {...props}/>);fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Revisão'}});fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar');expect(screen.getByText(/Revisar lacuna 1 de 2/)).toBeInTheDocument();
 expect(screen.getByLabelText('Atividade *')).toHaveValue('Revisão');expect(props.onChanged).not.toHaveBeenCalled();
});

it('bloqueia a gravação quando outra operação já preencheu o intervalo',async()=>{
 vi.mocked(window.foco.request).mockResolvedValue({days:[],undefinedPeriods:[]});
 render(<GapReviewDialog {...props}/>);fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Revisão'}});fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('não está mais disponível');
 expect(vi.mocked(window.foco.request).mock.calls.filter(c=>c[1]==='POST')).toHaveLength(0);
});

it('não reaproveita classificação por padrão',async()=>{
 render(<GapReviewDialog {...props}/>);fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Revisão'}});fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
 await waitFor(()=>expect(screen.getByText(/Revisar lacuna 1 de 1/)).toBeInTheDocument());expect(screen.getByLabelText('Atividade *')).toHaveValue('');
});

it('mantém o trecho restante quando apenas parte da lacuna é salva',async()=>{
 render(<GapReviewDialog {...props}/>);
 fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Revisão'}});
 const start=new Date(periods[0].startAt),end=new Date(start.getTime()+1800000);
 const local=new Date(end.getTime()-end.getTimezoneOffset()*60000).toISOString().slice(0,23);
 fireEvent.change(screen.getByLabelText('Término *'),{target:{value:local}});
 fireEvent.change(screen.getByLabelText('Horas de foco'),{target:{value:'0'}});
 fireEvent.change(screen.getByLabelText('Minutos de foco'),{target:{value:'30'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
 await waitFor(()=>expect(props.onChanged).toHaveBeenCalledTimes(1));
 expect(screen.getByText(/Revisar lacuna 1 de 2/)).toBeInTheDocument();
 expect(new Date((screen.getByLabelText('Início *') as HTMLInputElement).value).toISOString()).toBe(end.toISOString());
 expect(screen.getByLabelText('Minutos de foco')).toHaveValue(30);
});
