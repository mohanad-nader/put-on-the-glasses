import { Component, input, output, signal, inject } from '@angular/core';
import { SimulationStateService } from '../../services/simulation-state';

@Component({
  selector: 'app-url-form',
  templateUrl: './url-form.html',
  styleUrl: './url-form.css',
})
export class UrlForm {
  protected readonly state = inject(SimulationStateService);

  readonly inputId = input('site-url');
  readonly label = input('Website address');
  readonly buttonText = input('Put them on');
  readonly hint = input('');

  /** Fires after a valid address has been saved in the shared state. */
  readonly submitted = output<void>();

  protected readonly value = signal(this.state.url());

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
    if (this.state.urlError()) {
      this.state.urlError.set('');
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.state.loadUrl(this.value())) {
      this.submitted.emit();
    }
  }
}
