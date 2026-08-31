import { Component, input } from '@angular/core';
import { Survey } from '../../models/survey.model/survey.model';

@Component({
  selector: 'app-survey-card',
  imports: [],
  templateUrl: './survey-card.html',
  styleUrl: './survey-card.scss',
})
export class SurveyCard {
  survey = input.required<Survey>();
}