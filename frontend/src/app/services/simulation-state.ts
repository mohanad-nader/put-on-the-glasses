import { Injectable, computed, signal } from '@angular/core';

export type ColorBlindness =
  | 'none'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia';

@Injectable({ providedIn: 'root' })
export class SimulationStateService {
  // The site being tested
  readonly url = signal('');

  // Simulation modes
  readonly colorBlindness = signal<ColorBlindness>('none');
  readonly lowVision = signal(false);
  readonly zoomReflow = signal(false);
  readonly noMouse = signal(false);
  readonly noKeyboard = signal(false);
  readonly sideBySide = signal(false);

  // Low vision settings (sliders)
  readonly blur = signal(1.6);      // pixels
  readonly contrast = signal(0.7);  // 1 = normal, lower = weaker

  // True when at least one simulation is on
  readonly hasActiveMode = computed(
    () =>
      this.colorBlindness() !== 'none' ||
      this.lowVision() ||
      this.zoomReflow() ||
      this.noMouse() ||
      this.noKeyboard()
  );

  /** Saves the URL; adds https:// if the user left it out. */
  loadUrl(input: string): void {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    this.url.set(hasProtocol ? trimmed : 'https://' + trimmed);
  }

  /** Rule from the proposal: no mouse and no keyboard can't both be on. */
  setNoMouse(on: boolean): void {
    this.noMouse.set(on);
    if (on) {
      this.noKeyboard.set(false);
    }
  }

  setNoKeyboard(on: boolean): void {
    this.noKeyboard.set(on);
    if (on) {
      this.noMouse.set(false);
    }
  }

  /** Turns every simulation off. */
  reset(): void {
    this.colorBlindness.set('none');
    this.lowVision.set(false);
    this.zoomReflow.set(false);
    this.noMouse.set(false);
    this.noKeyboard.set(false);
    this.sideBySide.set(false);
    this.blur.set(1.6);
    this.contrast.set(0.7);
  }
}