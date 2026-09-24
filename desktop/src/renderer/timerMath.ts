export type TimerStep={total:number;saved:number;startedAt:number;shouldSave:boolean};

export function timerStep(saved:number,startedAt:number,now:number):TimerStep{
 const segment=Math.max(0,Math.floor((now-startedAt)/1000));
 const shouldSave=segment>=5;
 return{total:saved+segment,saved:shouldSave?saved+segment:saved,startedAt:shouldSave?startedAt+segment*1000:startedAt,shouldSave};
}
