import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SurveyDetail } from './pages/survey-detail/survey-detail';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'survey/:id',
    component: SurveyDetail,
  },
  {
    path: 'create-survey',
    redirectTo: '',
    pathMatch: 'full',
  },
];