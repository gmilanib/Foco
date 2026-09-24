export type Session = {
  id:string; taskId:string|null; client:string; project:string; activity:string; details:string;
  consultant:string; cardReference:string; startAt:string; endAt:string|null; plannedSeconds:number;
  focusSeconds:number; hourlyRate:number|null; status:'Em andamento'|'Pausada'|'Concluída'|'Encerrada'|'Interrompida'; category:'Normal'|'Agenda';
};
export type SessionInput=Omit<Session,'id'|'focusSeconds'>;
export type Task={id:string;client:string;project:string;activity:string;details:string;consultant:string;cardReference:string;hourlyRate:number|null;dueDate:string|null;completed:boolean;state:string;entries:number;focusSeconds:number};
export type GroupTotal={parent:string|null;name:string;client?:string|null;sessions:number;seconds:number;value:number;unpriced:number};
export type Dashboard={sessions:number;seconds:number;value:number;unpriced:number;groups:GroupTotal[];projects:GroupTotal[]};
export type Color={client:string;hex:string};
export type ApiError={error:string};
export type TimerNotice={elapsed:number;running:boolean;activity:string};

declare global {
  interface Window { foco: {
    request<T=unknown>(path:string,method?:string,body?:unknown):Promise<T>;
    importFolder():Promise<string|null>; chooseFolder():Promise<string|null>;
    saveCsv(fileName:string,content:string):Promise<string|null>;
    getTimer():Promise<TimerNotice>;
    showOverlay():void; closeOverlay():void; hideWindow():void; updateTimer(state:TimerNotice):void;
    onTimer(callback:(state:TimerNotice)=>void):()=>void;
  }; }
}
