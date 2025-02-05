import { PlanProperty } from "./plan_property";

export enum ExplanationRunStatus {
    pending,
    running,
    failed,
    finished
}

export interface ExplainerRequest  {
    id: string,
    callback: string,
    model: any;
    goals: PlanProperty[],
    softGoals: string[], // ids
    hardGoals: string[], // ids
}


export interface Result {
    MUGS:{
        complete: boolean,
        subsets: string[][] // plan property ids
    },
    MGCS:{
        complete: boolean,
        subsets: string[][] // plan property ids
    },
}

export interface ExplainerResponse  {
    id: string,
    status: ExplanationRunStatus,
    result: Result,
    runtime?: number // in sec
}