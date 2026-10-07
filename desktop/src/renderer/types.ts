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
export type HoursComparison={realSeconds:number;roundedSeconds:number;differenceSeconds:number;unknownPrecision:number;ongoingSessions:number};
export type Dashboard={sessions:number;seconds:number;value:number;unpriced:number;groups:GroupTotal[];projects:GroupTotal[];comparison?:HoursComparison};
export type WorkDay={day:string;workedSeconds:number;undefinedSeconds:number;regularSeconds:number;extraSeconds:number;estimated:boolean;targetSeconds?:number;scheduleSource?:string};
export type UndefinedPeriod={day:string;startAt:string;endAt:string;seconds:number};
export type WorkHoursReport={days:WorkDay[];undefinedPeriods:UndefinedPeriod[]};
export type Color={client:string;hex:string};
export type CatalogType='clients'|'projects'|'activities';
export type CatalogDuplicate={type:CatalogType;first:string;second:string;similarity:number};
export type Catalogs={items:Record<CatalogType,string[]>;possibleDuplicates:CatalogDuplicate[];archivedProjects?:string[];projectColorSeeds?:Record<string,number>};
export type ApiError={error:string};
export type TimerNotice={elapsed:number;running:boolean;activity:string};
export type WorkflowStatus={shortcut:{registered:boolean;accelerator:string;error:string};notificationsSupported:boolean;pending:{kind:'planning'|'review';day:string}[];silencedToday:boolean};
export type TodayNavigation={tab:'today'|'review'|'inbox';day:string};

declare global {
  interface Window { foco: {
    workflowStatus():Promise<WorkflowStatus|null>;
    workflowAction(kind:'planning'|'review',action:'open'|'snooze'|'dismiss'|'silence'):Promise<WorkflowStatus|null>;
    takeNavigation():Promise<TodayNavigation|null>;
    onNavigateToday(callback:(value:TodayNavigation)=>void):()=>void;
    onWorkflowStatus(callback:(value:WorkflowStatus)=>void):()=>void;
    appInfo():Promise<{version:string;channel:string;platform:string;java:string;dataDirectory:string;logDirectory:string}>;
    request<T=unknown>(path:string,method?:string,body?:unknown):Promise<T>;
    importFolder():Promise<string|null>; chooseFolder():Promise<string|null>; chooseBackup():Promise<string|null>; openErrorLogs():Promise<string>;
    saveCsv(fileName:string,content:string):Promise<string|null>;
    savePdf(fileName:string):Promise<string|null>;
    getTimer():Promise<TimerNotice>;
    showOverlay():void; closeOverlay():void; hideWindow():void; updateTimer(state:TimerNotice):void;
    onTimer(callback:(state:TimerNotice)=>void):()=>void;
  }; }
}
