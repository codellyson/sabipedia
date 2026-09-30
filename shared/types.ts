import type { GuideContent } from './guide'
export type GuideDetail = {id:string;slug:string;version_id:string;number:number;created_at:string;author:string;confirmations:number;local_confirmations:number;disputes:number;verified:boolean;content:GuideContent;media:Array<{id:string;content_type:string}>;history:Array<{id:string;number:number;created_at:string;author:string;change_note:string;confirmations:number}>;related:Array<{slug:string;title:string;summary:string;category:string}>}
export type GuideRevision = {id:string;guide_id:string;slug:string;number:number;created_at:string;author:string;published_by:string;content:GuideContent}
export type RevisionComparison = {revision:GuideRevision;previous:GuideRevision|null}
