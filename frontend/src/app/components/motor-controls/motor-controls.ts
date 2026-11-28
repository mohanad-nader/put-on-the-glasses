import { Component, inject } from '@angular/core';
import { FrameBridgeService } from '../../services/frame-bridge';
import { SimulationStateService } from '../../services/simulation-state';

/** Motor group of the settings panel: No keyboard and Hand tremor. */
@Component({
  selector: 'app-motor-controls',
  templateUrl: './motor-controls.html',
  styleUrl: './motor-controls.css',
})
export class MotorControls {
  protected readonly state = inject(SimulationStateService);
  protected readonly bridge = inject(FrameBridgeService);

  protected numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }
}
