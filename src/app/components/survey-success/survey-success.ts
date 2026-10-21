import { Component, output } from '@angular/core';

@Component({
  selector: 'app-survey-success',
  standalone: true,
  templateUrl: './survey-success.html',
  styleUrl: './survey-success.scss',
})
export class SurveySuccess {
  /** Emits when the user closes the success message. */
  closed = output<void>();
}