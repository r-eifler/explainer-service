export interface Action{
    'name': string,
    'arguments': string[]
}


export interface PlanProperty extends Document {
    _id?: string;
    name: string;
    project: string;
    type: string;
    formula: string;
}