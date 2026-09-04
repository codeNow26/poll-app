import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-survey',
  imports: [RouterLink, ReactiveFormsModule,],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})

export class CreateSurvey {
  surveyName = new FormControl('');
  surveyDescription = new FormControl('');
  surveyDeadline = new FormControl('');
  questionText = new FormControl('');
  answerTextA = new FormControl('');
  answerTextB = new FormControl('');
  multipleAnswers = new FormControl(false);

  questionForm = new FormGroup({
    questionText: this.questionText,
    answerTextA: this.answerTextA,
    answerTextB: this.answerTextB,
    multipleAnswers: this.multipleAnswers
  });

  checkQuestion() {
    console.log(this.questionForm.value);
  }


  isCategoryDropdownOpen = false;
  selectedCategory: 'Team Activities' | 'Health & Wellness' | 'Gaming & Entertainment' | 'Education & Learning' | 'Lifestyle & Preferences' | 'Technology & Innovation' | '' = '';

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen
  }

  switchCategory(button: 'Team Activities' | 'Health & Wellness' | 'Gaming & Entertainment' | 'Education & Learning' | 'Lifestyle & Preferences' | 'Technology & Innovation'): void {
    this.selectedCategory = button;
    this.isCategoryDropdownOpen = false;
  }
}
