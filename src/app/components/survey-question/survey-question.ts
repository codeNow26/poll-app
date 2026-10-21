import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { QuestionForm } from '../../types/survey-form.types';

@Component({
  selector: 'app-survey-question',
  imports: [ReactiveFormsModule],
  templateUrl: './survey-question.html',
  styleUrl: './survey-question.scss',
})
export class SurveyQuestion {
  question = input.required<QuestionForm>();
  questionIndex = input.required<number>();
  maxQuestionLength = input.required<number>();
  maxAnswerLength = input.required<number>();
  maxAnswers = input.required<number>();

  questionRemoved = output<void>();
  answerAdded = output<void>();
  answerRemoved = output<number>();

  answerLabels: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];
}