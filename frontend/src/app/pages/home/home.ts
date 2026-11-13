import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UrlForm } from '../../components/url-form/url-form';
import { SimulationStateService } from '../../services/simulation-state';

@Component({
  selector: 'app-home',
  imports: [UrlForm],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly router = inject(Router);
  private readonly state = inject(SimulationStateService);

  protected openTester(): void {
    this.router.navigate(['/tester'], { queryParams: { url: this.state.url() } });
  }
}
