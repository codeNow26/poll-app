import { Component, input, InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SavedSurvey } from '../../models/survey.model/survey.model';
import { SurveyCardVariant } from '../../types/survey-card-variant.type';

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

  /**
   * Returns a readable deadline label.
   * @returns The label, or an empty string when no deadline is set.
   */
  getDeadlineLabel(): string {
    const deadline: string | null = this.survey().deadline;
    if (deadline === null) {
      return '';
    }
    return this.formatDaysLeft(this.getDaysLeft(deadline));
  }

  /**
   * Calculates remaining calendar days without daylight-saving offsets.
   * @param deadline - Deadline in YYYY-MM-DD format.
   * @returns Days until the deadline, negative for expired surveys.
   */
  private getDaysLeft(deadline: string): number {
    const deadlineDay: number = this.getDeadlineDay(deadline);
    const currentDay: number = this.getCurrentDay();
    return Math.round(
      (deadlineDay - currentDay) / MILLISECONDS_PER_DAY,
    );
  }

  /**
   * Converts a deadline into a UTC calendar-day timestamp.
   * @param deadline - Deadline in YYYY-MM-DD format.
   * @returns The UTC timestamp for the deadline date.
   */
  private getDeadlineDay(deadline: string): number {
    const [year, month, day]: number[] = deadline.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  /**
   * Represents today's local calendar date as a UTC timestamp.
   * @returns The UTC timestamp for today's local date.
   */
  private getCurrentDay(): number {
    const today: Date = new Date();
    return Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
  }

  /**
   * Formats the remaining days as a readable deadline label.
   * @param daysLeft - Number of calendar days until the deadline.
   * @returns A label for an expired, current or upcoming deadline.
   */
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