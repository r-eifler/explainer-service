import express, { Request, Response } from 'express';
import fs from 'fs'
import { create_all_MUGS_MSGS_run, create_all_MUGS_MSGS_run_cost_bound } from '../run_explainer';
import { agenda } from '..';
import { toPDDL_domain, toPDDL_problem } from '../pddl';
import { auth } from '../middleware/auth';
import { setupExperimentEnvironment } from '../experiment_utils';


var kill = require('tree-kill');

export const explainerRouter = express.Router();


explainerRouter.get('/:id', async (req: Request, res: Response) => {

    // TODO return status of run with id 

    res.status(201).send("TODO");
});


explainerRouter.post('/all-mugs-msgs', auth, async (req: Request, res: Response) => {

  try{
    // console.log(req.body)

    let model = JSON.parse(req.body.model as string)
    let exp_setting = JSON.stringify(JSON.parse(req.body.exp_setting))
    const refId = req.body.id as string;

    // console.log("############## MODEL ################")
    // console.log(model)
    // console.log("############## MODEL ################")
    // console.log("############## PROPERTIES ################")
    // console.log(exp_setting)
    // console.log("############## PROPERTIES ################")

    

    setupExperimentEnvironment(model, exp_setting, refId);
    let exp_run = create_all_MUGS_MSGS_run(refId, model);

    res.status(201).send({id: exp_run.id, status: exp_run.status});

    const job = await agenda.now('explainer call', [refId, exp_run, req.body.callback]);

  }
  catch(err){
    console.log(err);
    res.status(500).send();
  }
  
});

// plannerRouter.post('/all-mugs-msgs-cost-bound', auth, async (req: Request, res: Response) => {

//   // console.log(req.body)

//   let model = JSON.parse(req.body.model as string)
//   let exp_setting = req.body.exp_setting as string
//   const cost_bound = req.body.cost_bound as string

//   let domain_path = './uploads/' + Date.now() + 'domain.pddl'
//   let problem_path = './uploads/' + Date.now() + 'problem.pddl'
//   let exp_setting_path = './uploads/' + Date.now() + 'exp-setting.json'


//   fs.writeFileSync(domain_path, toPDDL_domain(model));
//   fs.writeFileSync(problem_path, toPDDL_problem(model));
//   fs.writeFileSync(exp_setting_path, exp_setting)

//   let plan_run = create_all_MUGS_MSGS_run_cost_bound(re, model, domain_path, problem_path, exp_setting_path, cost_bound);

//   res.status(201).send({id: plan_run.id, status: plan_run.status});

//   const job = await agenda.now('explainer call', [plan_run, req.body.callback]);
//   // console.log(JSON.stringify(job,null,2));
  
// });


explainerRouter.post('/cancel', auth, async (req: Request, res: Response) => {

  try{
    const refId = req.body.id;
    console.log("Cancel: " + refId)

    const jobs = await agenda.jobs({name: 'explainer call'});
    // console.log(jobs.map(d => d['attrs']));

    const cancelJob = jobs.filter(j => j['attrs'].data[0] === refId)[0];

    if (cancelJob === undefined){
      return res.status(400).send();
    }

    // console.log(cancelJob);
    cancelJob.cancel();
    kill(cancelJob.attrs.data[3], 'SIGKILL');
    // console.log(cancelJob);
    // const result = await cancelJob.remove();
    // console.log("Canceled: " + result);
    res.status(201).send();
  }
  catch(err){
    console.log(err);
    res.status(500).send();
  }
});

