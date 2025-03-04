# OUTDATED!!!! Explainer Service

The explainer service runs a web server computing 

- **MUGS** (minimal unsolvable goal subsets)
- **MGCS** (minimal goal correction sets)

for a given problem and set of properties.

It is based on [Downward - XAIP](https://github.com/r-eifler/downward-xaip).

## API

It runs on port `3334`.


### Explanation Computation Request

HTTP `POST` request to route `/all-mugs-msgs` with data:

```json
    {
        "model": {
            "types": PDDLType[],
            "predicates": PDDLPredicate[],
            "actions": PDDLAction[],
            "objects": PDDLObject[],
            "initial": PDDLFact[],
            "goal": PDDLFact[]
        },
        "exp_setting":{
            "plan_properties":[
                {
                    "_id":<id>,
                    "name":<name>,
                    "type":<G|AS|LTL>,
                    "formula":<formula>,
                    "actionSets":[]
                },
                ...
            ],
            "hard_goals": [],
            "soft_goals": <list of property names>
        }
        "callback": <callback URL>
    }
```

A more detailed definition of `exp_setting` can be found in the README of 
[Downward - XAIP](https://github.com/r-eifler/downward-xaip). 

The used types are defied as (in Typescript):

```typescript
PDDLType {
    name: string;
    parent: string;
}

PDDLObject {
    name: string;
    type: string;
}

PDDLPredicate {
    name: string;
    negated: boolean;
    parameters: PDDLObject[];
}

PDDLFact {
    name: string;
    arguments: string[]; 
    negated: boolean;
}

PDDLFunctionAssignment {
    name: string;
    arguments: string[]; 
    value: number;
}

PDDLAction {
    name: string; 
    parameters:  PDDLObject[];
    precondition: PDDLFact[];
    effect: PDDLFact[];
}
```

#### Response

HTTP `POST` request to `callback` with data:

```json
{
    "status": <status number>,
    "MUGS": {
        "complete": true,
        "subsets": [
            <list of property ids>
            ...
        ]
    },
    "MGCS":{
        "complete": true,
        "subsets": [
            <list of property ids>,
            ...
        ]
    }
}
```

status number meaning:

- 0 = `PENDING`
- 1 = `RUNNING`
- 2 = `FAILED`
- 3 = `FINISHED`
