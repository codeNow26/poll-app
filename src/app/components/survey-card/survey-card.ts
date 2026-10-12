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
    variant = input<'featured' | 'compact'>('compact');

    getDeadlineLabel(): string {
        const deadline = this.survey().deadline;

        if (deadline === null) {
            return '';
        }

        const [year, month, day] = deadline.split('-').map(Number);
        const today = new Date();

        const deadlineDay = Date.UTC(year, month - 1, day);
        const currentDay = Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        const daysLeft = Math.round(
            (deadlineDay - currentDay) / (1000 * 60 * 60 * 24)
        );

        if (daysLeft < 0) {
            return 'Expired';
        }

        if (daysLeft === 0) {
            return 'Ends today';
        }

        if (daysLeft === 1) {
            return 'Ends in 1 Day';
        }

        return `Ends in ${daysLeft} Days`;
    }
}