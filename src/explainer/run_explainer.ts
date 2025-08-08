import { Job } from '@hokify/agenda';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { ExplainRun } from '../domain/explain_run';
import { PlanProperty } from '../domain/plan_property';
import { ExplainerRequest, ExplainerResponse, ExplanationRunStatus, Result } from '../domain/service_communication';
import { cleanUpExperimentEnvironment, setupExperimentEnvironment } from './experiment_utils';


export function createExplanationRun(request: ExplainerRequest): ExplainRun {
  return {
    request,
    status: ExplanationRunStatus.PENDING,
    experiment_path: process.env.TEMP_RUN_FOLDERS + '/' + request.id,
    explainer: process.env.EXPLAINER_SERVICE_PLANNER,
    args: [
      'domain.pddl', 
      'problem.pddl', 
      '--translate-options',
      '--explanation-settings', 'exp-setting.json',
      '--search-options',
      '--search', 'gsastar(evals=[blind], eval=ngs(hmax(no_deadends=true)), f=conflicts)'
    ]
  }
}


export async function schedule_run(explain_run: ExplainRun, job: Job) {

    setupExperimentEnvironment(explain_run.request.model, 
      {
        plan_properties: explain_run.request.goals,
        hard_goals: explain_run.request.hardGoals,
        soft_goals: explain_run.request.softGoals
      },
      explain_run.experiment_path
    )

    await run(explain_run, job);

    sendResult(explain_run)
   
    cleanUpExperimentEnvironment(explain_run.experiment_path)

}


function run(explain_run: ExplainRun, job: Job<any>): Promise<ExplainRun> {

    return new Promise(function (resolve, reject) {

      explain_run.status = ExplanationRunStatus.RUNNING
      let args = explain_run.args;

      if(explain_run.cost_bound){
        args = explain_run.args.map(a =>  ! a.includes('$cost_bound') ? a : a.replace('$cost_bound', explain_run.cost_bound));
      }

      console.log(explain_run.explainer + ' ' + args.join(' '))

      const options = {
        cwd: explain_run.experiment_path,
        env: process.env,
      };

      const explainProcess = spawn(explain_run.explainer, args, options);

      job.attrs.data.push(explainProcess.pid);
      job.save();

      if(process.env.DEBUG_OUTPUT == 'true'){
        explainProcess.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
        });
        
        explainProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
        });
      }
      
      explainProcess.on('close', function (code) { 
        switch(code) {
          case 0:
            explain_run.status = ExplanationRunStatus.FINISHED
            break;
          case 12:
            explain_run.status = ExplanationRunStatus.FINISHED
            break;
          default:
            explain_run.status = ExplanationRunStatus.FAILED
            break;
        }
        console.log("ReturnCode: " + code);
        resolve(explain_run);
      });
      explainProcess.on('error', function (err) {
        explain_run.status = ExplanationRunStatus.FAILED
        reject(err);
      });
    });
  }


function get_res(explain_run: ExplainRun): Result | undefined{

  const exp_settings_path = explain_run.experiment_path + '/exp-setting.json';

  if(! fs.existsSync(exp_settings_path)){
    return undefined;
  }

  const raw_explanation_settings = fs.readFileSync(exp_settings_path,'utf8');
  const explanation_settings = JSON.parse(raw_explanation_settings)
  const planProperties: PlanProperty[] = explanation_settings.plan_properties

  // console.log(planProperties)

  const result_folder_path = explain_run.experiment_path + '/conflicts'
  const raw_res = fs.readFileSync(result_folder_path,'utf8');

  const json_res = JSON.parse(raw_res)

  console.log("Out put FD:")
  console.log(json_res)

  const MSGS = json_res.MSGS.map(set => set.map(g => goal_translator(planProperties, g)))
  const allSoftPIds = planProperties.filter(pp => !pp.globalHardGoal).map(pp => pp._id)

  console.log(MSGS)

  const trans_res: Result = {
    MUGS: {
      complete: true,
      subsets: json_res.MUGS.map(set => set.map(g => goal_translator(planProperties, g)))
    },
    MGCS:{
      complete: true,
      subsets: MSGS.map(set => allSoftPIds.filter(id => ! set.includes(id)))
    }, 
  }


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
      const id = goal.replace('accepting(','').replace(')','')
      const match = plan_properties.filter(p => p.type == 'LTL' && p._id == id);
      if(match.length == 1){
        return match[0]._id
      }
    }
    
    return 'ERROR'
}


function sendResult(explainRun: ExplainRun) {

    let data: ExplainerResponse = {
      id: explainRun.request.id,
      status: explainRun.status,
      result: null
    }

  if(explainRun.status === ExplanationRunStatus.FINISHED){
    const result = get_res(explainRun);
    data.result = result; 
  }

  let payload = JSON.stringify(data);
  console.log("PAYLOAD:")
  console.log(payload)
  console.log("call back URL:" + explainRun.request.callback)

  const callbackRequest = new Request(explainRun.request.callback, 
    {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": 'Bearer ' + process.env.SERVICE_KEY
        },
        body: payload,
    }
  )

  fetch(callbackRequest).then
          (resp => {
            console.log("callback sent: " + explainRun.request.id)
            console.log("got response:", resp.status)
          },
          error => console.log(error)
      )
}

