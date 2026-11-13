import { Injectable, computed, signal } from '@angular/core';
import { ColorBlindness, cvdFilterId, cvdOption } from '../data/cvd-types';

export type { ColorBlindness } from '../data/cvd-types';

export const DEFAULT_BLUR = 1.6; // px
export const DEFAULT_CONTRAST = 0.7; // 1 = normal
export const DEFAULT_TUNNEL = 40; // size of the clear area, in percent
export const DESKTOP_FRAME_WIDTH = 1280;
export const REFLOW_FRAME_WIDTH = 320;

@Injectable({ providedIn: 'root' })
export class SimulationStateService {
  // The site being tested
  readonly url = signal('');
  readonly urlError = signal('');

  // Simulation modes
  readonly colorBlindness = signal<ColorBlindness>('none');
  readonly lowVision = signal(false);
  readonly zoomReflow = signal(false);
  readonly noMouse = signal(false);
  readonly noKeyboard = signal(false);
  readonly sideBySide = signal(false);

  // Low vision settings
  readonly blur = signal(DEFAULT_BLUR);
  readonly contrast = signal(DEFAULT_CONTRAST);
  readonly tunnelVision = signal(true);
  readonly tunnelSize = signal(DEFAULT_TUNNEL);

  // True when at least one simulation is on
  readonly hasActiveMode = computed(
    () =>
      this.colorBlindness() !== 'none' ||
      this.lowVision() ||
      this.zoomReflow() ||
      this.noMouse() ||
      this.noKeyboard()
  );

  /** CSS `filter` value for the site frame (color blindness and low vision stacked). */
  readonly frameFilter = computed(() => {
    const parts: string[] = [];
    const cb = this.colorBlindness();
    if (cb !== 'none') {
      parts.push(`url(#${cvdFilterId(cb)})`);
    }
    if (this.lowVision()) {
      parts.push(`blur(${this.blur()}px)`, `contrast(${this.contrast()})`);
    }
    return parts.length ? parts.join(' ') : 'none';
  });

  /** Short human-readable list of what is being simulated. */
  readonly activeSummary = computed(() => {
    const labels: string[] = [];
    const cb = this.colorBlindness();
    if (cb !== 'none') {
      labels.push(cvdOption(cb).label);
    }
    if (this.lowVision()) {
      labels.push('Low vision');
    }
    if (this.zoomReflow()) {
      labels.push('Zoom and reflow');
    }
    if (this.noMouse()) {
      labels.push('No mouse');
    }
    if (this.noKeyboard()) {
      labels.push('No keyboard');
    }
    return labels.length ? labels.join(' + ') : 'Normal vision';
  });

  /**
   * Validates and saves the URL. Adds https:// when the user left it out and
   * only accepts http(s). Returns false (and sets urlError) when it is invalid.
   */
  loadUrl(input: string): boolean {
    const trimmed = input.trim();
    if (!trimmed) {
      this.urlError.set('Enter a website address.');
      return false;
    }
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      this.urlError.set('That does not look like a website address.');
      return false;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      this.urlError.set('Only http and https addresses can be tested.');
      return false;
    }
    this.urlError.set('');
    this.url.set(parsed.toString());
    return true;
  }

  clearUrl(): void {
    this.url.set('');
    this.urlError.set('');
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

  /** Turns every simulation off (the site stays loaded). */
  reset(): void {
    this.colorBlindness.set('none');
    this.lowVision.set(false);
    this.zoomReflow.set(false);
    this.noMouse.set(false);
    this.noKeyboard.set(false);
    this.sideBySide.set(false);
    this.blur.set(DEFAULT_BLUR);
    this.contrast.set(DEFAULT_CONTRAST);
    this.tunnelVision.set(true);
    this.tunnelSize.set(DEFAULT_TUNNEL);
  }
}
