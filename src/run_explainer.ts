import {spawn} from 'child_process';
import * as fs from 'fs';
import { PlanningModel } from './pddl';
import { PlanProperty } from './interfaces';

export enum RunStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  FAILED = "FAILED",
  FINISHED = "FINISHED",
}

const results_folder = "conflicts"

interface Result {
  MUGS: {
    complete: false,
    subsets: []
  },
  MGCS:{
    complete: false,
    subsets: []
  },
}

export interface ExplainRun {
  id: string,
  model: PlanningModel,
  status: RunStatus,
  domain_path: string,
  problem_path: string,
  exp_settings_path: string,
  cost_bound?: string,
  explainer: string,
  args: string[]
}


export function create_all_MUGS_MSGS_run(id: string, model: PlanningModel, domain_path: string, problem_path: string, exp_settings_path: string): ExplainRun {
  return {
    id,
    model,
    status: RunStatus.PENDING,
    domain_path,
    problem_path,
    exp_settings_path,
    explainer: process.env['PLANNER_FD_XAIP'],
    args: [
      domain_path, 
      problem_path, 
      '--translate-options',
      '--explanation-settings', exp_settings_path,
      '--search-options',
      '--search', 'gsastar(evals=[blind], eval=ngs(hmax(no_deadends=true)), f=$conflicts)'
    ]
  }
}


export function create_all_MUGS_MSGS_run_cost_bound(id: string, model: PlanningModel, domain_path: string, problem_path: string, exp_settings_path: string, cost_bound: string): ExplainRun {
  return {
    id,
    model,
    status: RunStatus.PENDING,
    domain_path,
    problem_path,
    exp_settings_path,
    cost_bound,
    explainer: process.env['PLANNER_FD_XAIP'],
    args: [
      domain_path, 
      problem_path, 
      '--translate-options',
      '--explanation-settings', exp_settings_path,
      '--search-options',
      '--search', 'gsastar(evals=[blind], eval=ngs(hmax(no_deadends=true)), f=$conflicts, bound=$cost_bound)'
    ]
  }
}



export async function schedule_run(explain_run: ExplainRun, callback: string) {

    await run(explain_run);

    let data = {
        id: explain_run.id,
        status: explain_run.status,
        MUGS: {
          complete: false,
          subsets: []
        },
        MGCS:{
          complete: false,
          subsets: []
        }, 
    }

    if(explain_run.status != RunStatus.FAILED){
      const result = get_res(explain_run);
      
      data.MUGS = result.MUGS
      data.MGCS = result.MGCS    
    }

    // console.log(data)

    let payload = JSON.stringify(data);
    console.log("PAYLOAD:")
    console.log(payload)
    console.log(callback)

    const callbackRequest = new Request(callback, 
      {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: payload,
      }
    )

    fetch(callbackRequest).then
            (resp => {
              console.log("callback sent: " + explain_run.id)
              console.log("got response:", resp.status)
            },
            error => console.log(error)
        )
  }


function run(explain_run: ExplainRun): Promise<ExplainRun> {

    // create result folder
    let conflicts_path = results_folder + '/conflicts' + explain_run.id

    return new Promise(function (resolve, reject) {

      explain_run.status = RunStatus.RUNNING
      let args = explain_run.args.map(a =>  ! a.includes('$conflicts') ? a : a.replace('$conflicts', conflicts_path));

      if(explain_run.cost_bound){
        args = explain_run.args.map(a =>  ! a.includes('$cost_bound') ? a : a.replace('$cost_bound', explain_run.cost_bound));
      }

      console.log(explain_run.explainer + ' ' + args.join(' '))

      const process = spawn(explain_run.explainer, args);
      process.on('close', function (code) { 
        switch(code) {
          case 0:
            explain_run.status = RunStatus.FINISHED
            break;
          case 12:
            explain_run.status = RunStatus.FINISHED
            break;
          default:
            explain_run.status = RunStatus.FAILED
            break;
        }
        console.log("ReturnCode: " + code);
        resolve(explain_run);
      });
      process.on('error', function (err) {
        explain_run.status = RunStatus.FAILED
        // console.log("Error: " + err)
        reject(err);
      });
    });
  }


function get_res(explain_run: ExplainRun): Result | undefined{

  if(! fs.existsSync(explain_run.exp_settings_path)){
    return undefined;
  }

  const raw_explanation_settings = fs.readFileSync(explain_run.exp_settings_path,'utf8');
  const explanation_settings = JSON.parse(raw_explanation_settings)
  const planProperties: PlanProperty[] = explanation_settings.plan_properties

  console.log(planProperties)

  const result_folder_path = results_folder + '/conflicts' + explain_run.id
  const raw_res = fs.readFileSync(result_folder_path,'utf8');

  const json_res = JSON.parse(raw_res)

  const MSGS = json_res.MSGS.map(set => set.map(g => goal_translator(planProperties, g)))
  const allPPIds = planProperties.map(pp => pp._id)

  console.log(MSGS)

  const trans_res: Result = {
    MUGS: {
      complete: false,
      subsets: json_res.MUGS.map(set => set.map(g => goal_translator(planProperties, g)))
    },
    MGCS:{
      complete: false,
      subsets: MSGS.map(set => allPPIds.filter(id => ! set.includes(id)))
    }, 
  }

  // console.log(json_res)
  // console.log(trans_res)

  return trans_res
}

function goal_translator(plan_properties: PlanProperty[], goal: string): string{

    if(goal.startsWith('Atom')){
      const formula = goal.replace('Atom ', '').replace(/\s/g, '').toLowerCase();
      const match = plan_properties.filter(p => p.type == 'G' && p.formula.replace(/\s/g, '').toLowerCase() == formula);
      if(match.length == 1){
        return match[0]._id
      }
    }

    if(goal.startsWith('accepting')){
      const name = goal.replace('accepting(','').replace(')','')
      const match = plan_properties.filter(p => p.type == 'LTL' && p.name == name);
      if(match.length == 1){
        return match[0]._id
      }
    }
    
    return 'ERROR'
}



  
// function get_plan(plan_run: ExplainRun): Action[] {
//   if(plan_run.status != RunStatus.SOLVED){
//     return null
//   }

//   let action_names = plan_run.model.actions.map(a => a.name)

//   let plan_folder_path = plans_folder + '/conflicts' + plan_run.id
//   let raw_plan = fs.readFileSync(plan_folder_path,'utf8');

//   let raw_plan_actions = raw_plan.split('\n');
//   raw_plan_actions = raw_plan_actions.filter(a => ! a.startsWith(';') && a.length > 0)

//   console.log(raw_plan_actions)

//   let actions: Action[] = []
//   for(let raw_action of raw_plan_actions){
//     const parts = raw_action.replace(')','').replace('(','').split(' ');
    
//     if(! action_names.includes(parts[0])){
//       continue;
//     }

//     const [name,...args] = parts;
//     actions.push({name, arguments: args})
//   }
//   return actions
// }

