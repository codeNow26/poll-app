import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { CreateSurvey } from './pages/create-survey/create-survey';
export const routes: Routes = [
    {
        path: '',
        component: Home,
    },
    {
        path: 'create-survey',
        component: CreateSurvey,
    },

];


