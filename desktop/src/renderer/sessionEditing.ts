export function localDateTimeInput(value:string|null):string{
 if(!value)return '';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '';
 const pad=(part:number)=>String(part).padStart(2,'0');
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeIso(value:string):string{
 const date=new Date(value);
 if(!value||!Number.isFinite(date.getTime()))throw new Error('Informe uma data e hora válidas.');
 return date.toISOString();
}

export function focusSecondsBetween(start:string,end:string):number{
 const startTime=new Date(start).getTime(),endTime=new Date(end).getTime();
 if(!Number.isFinite(startTime)||!Number.isFinite(endTime)||endTime<=startTime)throw new Error('O término deve ocorrer depois do início.');
 return (endTime-startTime)/1000;
}
