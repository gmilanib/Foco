export type Session = {
  virtual?:boolean; workIntervals?:WorkInterval[];
  id:string; taskId:string|null; client:string; project:string; activity:string; details:string;
  consultant:string; cardReference:string; startAt:string; endAt:string|null; roundedEndAt?:string|null; plannedSeconds:number;
  focusSeconds:number; hourlyRate:number|null; status:'Em andamento'|'Pausada'|'Concluída'|'Encerrada'|'Interrompida'; category:'Normal'|'Agenda';
};
export type WorkInterval={sessionId:string;startAt:string;endAt:string|null;lastTickAt:string;precision:string};
export type SessionInput=Omit<Session,'id'|'focusSeconds'>;
export type Task={id:string;client:string;project:string;activity:string;details:string;consultant:string;cardReference:string;hourlyRate:number|null;dueDate:string|null;completed:boolean;state:string;entries:number;focusSeconds:number;realFocusSeconds?:number;archived?:boolean;projectArchived?:boolean;checklistTotal?:number;checklistCompleted?:number};
export type ChangeEntry={id:string;entityType:'task'|'session'|'project';entityId:string;changedAt:string;oldValue:string|null;newValue:string|null};
export type GroupTotal={parent:string|null;name:string;client?:string|null;sessions:number;seconds:number;value:number;unpriced:number;aggregate?:boolean};
export type Dashboard={sessions:number;seconds:number;value:number;unpriced:number;groups:GroupTotal[];projects:GroupTotal[]};
export type WorkDay={day:string;workedSeconds:number;undefinedSeconds:number;regularSeconds:number;extraSeconds:number;estimated:boolean};
export type UndefinedPeriod={day:string;startAt:string;endAt:string;seconds:number};
export type WorkHoursReport={days:WorkDay[];undefinedPeriods:UndefinedPeriod[]};
export type Color={client:string;hex:string};
export type CatalogType='clients'|'projects'|'activities';
export type CatalogDuplicate={type:CatalogType;first:string;second:string;similarity:number};
export type Catalogs={items:Record<CatalogType,string[]>;possibleDuplicates:CatalogDuplicate[];archivedProjects?:string[]};
export type ApiError={error:string};
export type TimerNotice={elapsed:number;running:boolean;activity:string};

declare global {
  interface Window { foco: {
    appInfo():Promise<{version:string;channel:string;platform:string;java:string;dataDirectory:string;logDirectory:string}>;
    request<T=unknown>(path:string,method?:string,body?:unknown):Promise<T>;
    importFolder():Promise<string|null>; chooseFolder():Promise<string|null>; openErrorLogs():Promise<string>;
    saveCsv(fileName:string,content:string):Promise<string|null>;
    savePdf(fileName:string):Promise<string|null>;
    getTimer():Promise<TimerNotice>;
    showOverlay():void; closeOverlay():void; hideWindow():void; updateTimer(state:TimerNotice):void;
    onTimer(callback:(state:TimerNotice)=>void):()=>void;
  }; }
}
