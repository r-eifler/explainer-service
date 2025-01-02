import express, { Request, Response } from 'express';
import fs from 'fs'
import { create_all_MUGS_MSGS_run, create_all_MUGS_MSGS_run_cost_bound } from '../run_explainer';
import { agenda } from '..';
import { toPDDL_domain, toPDDL_problem } from '../pddl';
import { auth } from '../middleware/auth';


export const plannerRouter = express.Router();


plannerRouter.get('/:id', async (req: Request, res: Response) => {

    // TODO return status of run with id 

    res.status(201).send("TODO");
});


plannerRouter.post('/all-mugs-msgs', auth, async (req: Request, res: Response) => {

  // console.log(req.body)

  let model = JSON.parse(req.body.model as string)
  let exp_setting = JSON.stringify(JSON.parse(req.body.exp_setting))

  console.log("############## MODEL ################")
  console.log(model)
  console.log("############## MODEL ################")
  console.log("############## PROPERTIES ################")
  console.log(exp_setting)
  console.log("############## PROPERTIES ################")

  let domain_path = './uploads/' + Date.now() + 'domain.pddl'
  let problem_path = './uploads/' + Date.now() + 'problem.pddl'
  let exp_setting_path = './uploads/' + Date.now() + 'exp-setting.json'


  fs.writeFileSync(domain_path, toPDDL_domain(model));
  fs.writeFileSync(problem_path, toPDDL_problem(model));
  fs.writeFileSync(exp_setting_path, exp_setting)

  let plan_run = create_all_MUGS_MSGS_run('run-' + Date.now(), model, domain_path, problem_path, exp_setting_path);

  res.status(201).send({id: plan_run.id, status: plan_run.status});

  agenda.now('planner call', [plan_run, req.body.callback])
  
});

plannerRouter.post('/all-mugs-msgs-cost-bound', auth, async (req: Request, res: Response) => {

  // console.log(req.body)

  let model = JSON.parse(req.body.model as string)
  let exp_setting = req.body.exp_setting as string
  const cost_bound = req.body.cost_bound as string

  let domain_path = './uploads/' + Date.now() + 'domain.pddl'
  let problem_path = './uploads/' + Date.now() + 'problem.pddl'
  let exp_setting_path = './uploads/' + Date.now() + 'exp-setting.json'


  fs.writeFileSync(domain_path, toPDDL_domain(model));
  fs.writeFileSync(problem_path, toPDDL_problem(model));
  fs.writeFileSync(exp_setting_path, exp_setting)

  let plan_run = create_all_MUGS_MSGS_run_cost_bound('run-' + Date.now(), model, domain_path, problem_path, exp_setting_path, cost_bound);

  res.status(201).send({id: plan_run.id, status: plan_run.status});

  agenda.now('planner call', [plan_run, req.body.callback])
  
});


// plannerRouter.post('/one-mugs', async (req: Request, res: Response) => {

//   console.log(req.body)

//   let model = JSON.parse(req.body.model as string)
//   let exp_setting = req.body.temp_goals as string

//   let domain_path = './uploads/' + Date.now() + 'domain.pddl'
//   let problem_path = './uploads/' + Date.now() + 'problem.pddl'
//   let exp_setting_path = './uploads/' + Date.now() + 'exp-setting.json'


//   fs.writeFileSync(domain_path, toPDDL_domain(model));
//   fs.writeFileSync(problem_path, toPDDL_problem(model));
//   fs.writeFileSync(exp_setting_path, exp_setting)

//   let plan_run = create_one_MUGS('run-' + Date.now(), model, domain_path, problem_path, exp_setting_path);

//   res.status(201).send({id: plan_run.id, status: plan_run.status});

//   agenda.now('planner call', [plan_run, req.body.callback])
  
// });


// plannerRouter.post('/one-msgs', async (req: Request, res: Response) => {

//   console.log(req.body)

//   let model = JSON.parse(req.body.model as string)
//   let exp_setting = req.body.temp_goals as string

//   let domain_path = './uploads/' + Date.now() + 'domain.pddl'
//   let problem_path = './uploads/' + Date.now() + 'problem.pddl'
//   let exp_setting_path = './uploads/' + Date.now() + 'exp-setting.json'


//   fs.writeFileSync(domain_path, toPDDL_domain(model));
//   fs.writeFileSync(problem_path, toPDDL_problem(model));
//   fs.writeFileSync(exp_setting_path, exp_setting)

//   let plan_run = create_one_MSGS('run-' + Date.now(), model, domain_path, problem_path, exp_setting_path);

//   res.status(201).send({id: plan_run.id, status: plan_run.status});

//   agenda.now('planner call', [plan_run, req.body.callback])
  
// });