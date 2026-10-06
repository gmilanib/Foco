import type { Session } from './types';
export type HoursMode='real'|'rounded';
export function focusSeconds(session:Session,mode:HoursMode):number {
 if(mode==='rounded'||session.virtual||!session.endAt||!session.roundedEndAt)return session.focusSeconds;
 const increment=(Date.parse(session.roundedEndAt)-Date.parse(session.endAt))/1000;
 return Number.isFinite(increment)?Math.max(0,session.focusSeconds-Math.max(0,increment)):session.focusSeconds;
}
