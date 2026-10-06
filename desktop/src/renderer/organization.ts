import type { Catalogs,Task } from './types';
export const isArchived=(task:Task)=>!!(task.archived||task.projectArchived);
export function availableCatalogs(catalogs:Catalogs):Catalogs{
 return {...catalogs,items:{...catalogs.items,projects:catalogs.items.projects.filter(name=>!catalogs.archivedProjects?.includes(name))}};
}
