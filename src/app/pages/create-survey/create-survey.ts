import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
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

  questions = new FormArray([this.createQuestionForm()]);

  checkQuestion() {
    console.log(this.questions.value);
    console.log(this.getAnswers(0).value);
  }

  createQuestionForm(): FormGroup {
    return new FormGroup({
      questionText: new FormControl(''),
      answers: new FormArray([
        new FormControl(''),
        new FormControl(''),
      ]),
      multipleAnswers: new FormControl(false)
    });
  }

  addQuestion(): void {
    this.questions.push(this.createQuestionForm());
  }

  getAnswers(questionIndex: number): FormArray {
    return this.questions
      .at(questionIndex)
      .get('answers') as FormArray;
  }

  addAnswer(questionIndex: number): void {
    const answerArray = this.getAnswers(questionIndex);

    if (answerArray.length < 6) {
      answerArray.push(new FormControl(''));
    }
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

  letter = ['A', 'B', 'C', 'D', 'E', 'F'];
}
