import { Component, ElementRef, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SvgDefs } from './components/svg-defs/svg-defs';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SvgDefs],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /**
   * Skip link. A plain "#main" href would resolve against <base href="/">
   * and reload the home page, so focus is moved by hand instead.
   */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
