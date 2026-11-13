import { Component, inject } from '@angular/core';
import { CVD_OPTIONS, ColorBlindness, cvdFilterId } from '../../data/cvd-types';
import { SimulationStateService } from '../../services/simulation-state';

@Component({
  selector: 'app-simulation-panel',
  templateUrl: './simulation-panel.html',
  styleUrl: './simulation-panel.css',
})
export class SimulationPanel {
  protected readonly state = inject(SimulationStateService);
  protected readonly options = CVD_OPTIONS;
  protected readonly swatches = ['#d1342f', '#e8892b', '#2e9e4f', '#2f6fd0', '#8a3fb0'];

  protected swatchFilter(id: ColorBlindness): string | null {
    return id === 'none' ? null : `url(#${cvdFilterId(id)})`;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }
}
