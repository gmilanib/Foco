import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { ReportPage } from './pages/ReportPage';
import { TasksPage } from './pages/TasksPage';
import type { Catalogs } from './types';

afterEach(cleanup);
const today=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
const catalogs:Catalogs={items:{clients:[],projects:[],activities:['Atividade']},possibleDuplicates:[]};
it('sugere hoje como período inicial dos relatórios',()=>{
 render(<ReportPage items={[]} colors={[]} showValues={false} onRefresh={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onBatch={vi.fn()} onExport={vi.fn()}/>);
 expect(screen.getByLabelText('Data inicial')).toHaveValue(today());expect(screen.getByLabelText('Data final')).toHaveValue(today());
});
it('sugere hoje como prazo inicial de uma tarefa nova',()=>{
 render(<TasksPage defaultDueDate="today" items={[]} history={[]} catalogs={catalogs} colors={[]} showValues={false} onSave={vi.fn()} onStart={vi.fn()} onComplete={vi.fn()} onStatusChange={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));expect(screen.getByLabelText('Prazo limite')).toHaveValue(today());
});
