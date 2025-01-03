
import fs from 'fs'
import { PlanningModel, toPDDL_domain, toPDDL_problem } from './pddl';

export function setupExperimentEnvironment(model: PlanningModel, exp_setting: string, refId: string){

    const exp_folder = process.env.TEMP_RUN_FOLDERS + '/' + refId;

    fs.mkdirSync(exp_folder);

    const domain_path = exp_folder + '/domain.pddl'
    const problem_path = exp_folder + '/problem.pddl'
    const exp_setting_path = exp_folder + '/exp-setting.json'


    fs.writeFileSync(domain_path, toPDDL_domain(model));
    fs.writeFileSync(problem_path, toPDDL_problem(model));
    fs.writeFileSync(exp_setting_path, exp_setting)

}