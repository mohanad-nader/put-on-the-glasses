import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SimulationPanel } from '../../components/simulation-panel/simulation-panel';
import { SiteFrame } from '../../components/site-frame/site-frame';
import { UrlForm } from '../../components/url-form/url-form';
import { SimulationStateService } from '../../services/simulation-state';

@Component({
  selector: 'app-tester',
  imports: [SiteFrame, SimulationPanel, UrlForm],
  templateUrl: './tester.html',
  styleUrl: './tester.css',
})
export class Tester {
  protected readonly state = inject(SimulationStateService);
  private readonly router = inject(Router);

  constructor() {
    // Keeps the site after a page refresh or when a link is shared.
    const fromLink = inject(ActivatedRoute).snapshot.queryParamMap.get('url');
    if (fromLink && !this.state.url()) {
      this.state.loadUrl(fromLink);
    }
  }

  protected onSiteChosen(): void {
    this.router.navigate([], { queryParams: { url: this.state.url() }, replaceUrl: true });
  }

  protected changeSite(): void {
    this.state.clearUrl();
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}
