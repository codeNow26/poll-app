import { Component, input, InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SavedSurvey } from '../../models/survey.model/survey.model';

type SurveyCardVariant = 'featured' | 'compact';

const MILLISECONDS_PER_DAY: number = 86_400_000;

@Component({
  selector: 'app-survey-card',
  imports: [RouterLink],
  templateUrl: './survey-card.html',
  styleUrl: './survey-card.scss',
})
export class SurveyCard {
  readonly survey: InputSignal<SavedSurvey> = input.required<SavedSurvey>();
  readonly variant: InputSignal<SurveyCardVariant> =
    input<SurveyCardVariant>('compact');

  /** Returns the deadline label or an empty string for open-ended surveys. */
  getDeadlineLabel(): string {
    const DEADLINE: string | null = this.survey().deadline;
    if (DEADLINE === null) {
      return '';
    }
    return this.formatDaysLeft(this.getDaysLeft(DEADLINE));
  }

  /** Calculates remaining calendar days without daylight-saving offsets. */
  private getDaysLeft(deadline: string): number {
    const DEADLINE_DAY: number = this.getDeadlineDay(deadline);
    const CURRENT_DAY: number = this.getCurrentDay();
    return Math.round(
      (DEADLINE_DAY - CURRENT_DAY) / MILLISECONDS_PER_DAY,
    );
  }

  /** Converts a date-only deadline into a UTC calendar-day timestamp. */
  private getDeadlineDay(deadline: string): number {
    const [YEAR, MONTH, DAY]: number[] = deadline.split('-').map(Number);
    return Date.UTC(YEAR, MONTH - 1, DAY);
  }

  /** Represents today's local calendar date as a UTC timestamp. */
  private getCurrentDay(): number {
    const TODAY: Date = new Date();
    return Date.UTC(
      TODAY.getFullYear(),
      TODAY.getMonth(),
      TODAY.getDate(),
    );
  }

  /** Formats the remaining days as a readable deadline label. */
  private formatDaysLeft(daysLeft: number): string {
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