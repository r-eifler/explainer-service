# Explainer Service for IPEXCO Platform

The explainer service runs a web server computing 

- **MUGS** (minimal unsolvable goal subsets)
- **MGCS** (minimal goal correction sets)

for a given problem and set of properties.

It is based on [Downward - XAIP](https://github.com/r-eifler/downward-xaip).


## Setup 

Unless you want to change/update the planner service, we suggest running 
the planner in a docker container. 

A pre-build docker image is provided on DockerHub: [Planner Service](https://hub.docker.com/repository/docker/eifler/planner-service/general).

To build the docker image yourself run:

```
docker build -t planner-service .
```

### Dependencies

The dependencies are:

- `npm` (https://www.npmjs.com/)
- `node.js` version 22 (https://nodejs.org/en)
- `python 3.11`
    - `numpy`
    - `scipy`
    - `mip`

For the dependencies of the planner and the ltlf translator, we refer to 
respective repositories:

- [Planner](https://github.com/r-eifler/downward-xaip)
- [LTL Translator](https://bitbucket.org/acamacho/ltlfkit)


Before the first run install npm packages with:

```
npm install
```

### Run

To run the development server on the default port (`3334`) run:

```
npm start
```

### Environment

The following environment variables can be defined, either in a `.env` file 
if you run the service natively on your machine or in an environment file 
for the docker image. 

- `PORT`: port used by the web server of the service

- `CONCURRENT_PLANNER_RUNS`: maximal number if job scheduled concurrently
- `DEBUG_OUTPUT`: print debug output

- `MONGO_DB`: URL of the MongoDB database with a unique name used by the job 
    scheduler of the service

- `API_KEY`: a random string that is used to authenticate a request from the 
    back-end to a service
- `SERVICE_KEY`: a random string that is used to authenticate any registered 
    services, e.g. planner


**Attention**: If you register a new service in the web interface, then 
requested API Key and the `API_KEY` defined in the service environment 
must match

The following variables are only required, if the service is run natively:

- `TEMP_RUN_FOLDERS`: path to a folder to store the input of the planner and 
    its intermediate results
- `PLANNER_SERVICE_PLANNER`: path to the planner executable. If you use the 
    included version of Fast Downward set this variable to the absolute 
    location of `downward-xaip/fast-downward.py`.


## API

### Explanation Computation Request

HTTP `POST` request to route `/all-mugs-msgs` with data:

```json
    {
        "id": string,
        "model": {
            "types": PDDLType[],
            "predicates": PDDLPredicate[],
            "actions": PDDLAction[],
            "objects": PDDLObject[],
            "initial": PDDLFact[],
            "goal": PDDLFact[]
        },
        "goals": PlanProperty[],
        "softGoals": string[], // goal ids
        "hardGoals": string[], // goal ids
        "callback": <callback URL>
    }
```

A more detailed definition of `exp_setting` can be found in the README of 
[Downward - XAIP](https://github.com/r-eifler/downward-xaip). 

The types used to define the model are defied as (Typescript interfaces):

```typescript
interface PDDLType {
    name: string;
    parent: string;
}

interface PDDLObject {
    name: string;
    type: string;
}

interface PDDLPredicate {
    name: string;
    negated: boolean;
    parameters: PDDLObject[];
}

interface PDDLFact {
    name: string;
    arguments: string[]; 
    negated: boolean;
}

interface PDDLFunctionAssignment {
    name: string;
    arguments: string[]; 
    value: number;
}

interface PDDLAction {
    name: string; 
    parameters:  PDDLObject[];
    precondition: PDDLFact[];
    effect: PDDLFact[];
}
```

Goals are defined as plan properties, the field required here are:

```Typescript

export interface PlanProperty {
    _id: string;
    name: string;
    type: string;
    formula: string;
    actionSets: ActionSet[];
}
```

For a description of the individual fields we refer to 
[Downward - XAIP](https://github.com/r-eifler/downward-xaip).

#### Response

HTTP `POST` request to `callback` with data:

```json
{
    "id": string, // same as in the request
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

`complete` indicates, that the response contains all MUGS/MGCS.

Possible status are number meaning:

```
PENDING
RUNNING
FAILED
FINISHED
```