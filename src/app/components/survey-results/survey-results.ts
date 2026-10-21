import { Component, input, signal, WritableSignal } from '@angular/core';
import { SavedSurvey } from '../../models/survey.model/survey.model';
import { SurveyVote } from '../../models/survey-vote.model';

const PERCENTAGE_FACTOR: number = 100;

@Component({
  selector: 'app-survey-results',
  templateUrl: './survey-results.html',
  styleUrl: './survey-results.scss',
})
export class SurveyResults {
  questions = input.required<SavedSurvey['questions']>();
  votes = input.required<SurveyVote[]>();
  areResultsOpen: WritableSignal<boolean> = signal(true);

  /**
   * Counts the displayed votes for a question, including the preview.
   * @param questionId - ID of the question.
   * @returns Number of votes belonging to the question.
   */
  getQuestionVoteCount(questionId: number): number {
    return this.votes().filter(
      (vote: SurveyVote): boolean => vote.question_id === questionId,
    ).length;
  }

  /**
   * Counts displayed votes containing a specific answer.
   * @param questionId - ID of the question.
   * @param answerIndex - Zero-based position of the answer.
   * @returns Number of votes containing that answer.
   */
  getAnswerVoteCount(questionId: number, answerIndex: number): number {
    return this.votes().filter(
      (vote: SurveyVote): boolean =>
        vote.question_id === questionId &&
        vote.answer_indices.includes(answerIndex),
    ).length;
  }

  /**
   * Calculates an answer's percentage of the displayed question votes.
   * @param questionId - ID of the question.
   * @param answerIndex - Zero-based position of the answer.
   * @returns Rounded percentage, or zero when no votes exist.
   */
  getAnswerPercentage(questionId: number, answerIndex: number): number {
    const totalVotes: number = this.getQuestionVoteCount(questionId);
    if (totalVotes === 0) {
      return 0;
    }
    const answerVotes: number = this.getAnswerVoteCount(questionId, answerIndex);
    return Math.round((answerVotes / totalVotes) * PERCENTAGE_FACTOR);
  }
}