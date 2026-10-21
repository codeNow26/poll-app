import { Component, output } from '@angular/core';

@Component({
  selector: 'app-home-hero',
  imports: [],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
})
export class HomeHero {
  /** Emits when the user wants to create a survey. */
  createRequested = output<void>();
}