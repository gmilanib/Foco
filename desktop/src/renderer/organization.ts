import type { Catalogs,Task } from './types';
export const isArchived=(task:Task)=>!!(task.archived||task.projectArchived);
export const canSelectForSession=(task:Task)=>!task.completed&&task.state!=='Concluída'&&!isArchived(task);
export function availableCatalogs(catalogs:Catalogs):Catalogs{
 return {...catalogs,items:{...catalogs.items,projects:catalogs.items.projects.filter(name=>!catalogs.archivedProjects?.includes(name))}};
}

export function projectsForClient(catalogs:Catalogs,client:string):string[]{
 return catalogs.items.projects.filter(project=>catalogs.projectClients?.[project]?.includes(client));
}
