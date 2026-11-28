import { Component, computed, inject, signal } from '@angular/core';
import { SrItem } from '../../models/frame-messages';
import { FrameBridgeService } from '../../services/frame-bridge';
import { SimulationStateService } from '../../services/simulation-state';

export type SrFilter = 'all' | 'headings' | 'landmarks' | 'links' | 'forms' | 'problems';

const LANDMARKS = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'form', 'search'];
const FORM_ROLES = ['textbox', 'searchbox', 'checkbox', 'radio', 'combobox', 'slider', 'button'];
// roles where a missing name is a problem, so "unlabeled" is worth saying (a plain list or landmark needs no name)
const NEEDS_NAME = [
  'link', 'button', 'heading', 'textbox', 'searchbox', 'checkbox', 'radio', 'combobox', 'slider', 'image',
];

// plain wording for the flags that 30-screenreader.js sends
const FLAG_TEXT: Record<string, string> = {
  'no-alt': 'missing alt text',
  'no-name': 'no accessible name',
  'generic-link': 'generic link text',
  'filename-alt': 'file name as alt text',
  'skipped-level': 'skipped heading level',
  'placeholder-only': 'placeholder only',
  'empty-heading': 'empty heading',
};

@Component({
  selector: 'app-inspect-panel',
  templateUrl: './inspect-panel.html',
  styleUrl: './inspect-panel.css',
})
export class InspectPanel {
  protected readonly bridge = inject(FrameBridgeService);
  protected readonly state = inject(SimulationStateService);

  protected readonly filters: { id: SrFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'headings', label: 'Headings' },
    { id: 'landmarks', label: 'Landmarks' },
    { id: 'links', label: 'Links' },
    { id: 'forms', label: 'Forms' },
    { id: 'problems', label: 'Problems' },
  ];
  protected readonly filter = signal<SrFilter>('all');

  // "Read aloud" needs the browser speech API, it is missing in some browsers and in the unit tests
  protected readonly canSpeak =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  protected readonly shown = computed(() => {
    const f = this.filter();
    return this.bridge.srItems().filter((i) => {
      switch (f) {
        case 'headings':
          return i.role === 'heading';
        case 'landmarks':
          return LANDMARKS.includes(i.role);
        case 'links':
          return i.role === 'link';
        case 'forms':
          return FORM_ROLES.includes(i.role);
        case 'problems':
          return i.flags.length > 0;
        default:
          return true;
      }
    });
  });

  protected readonly problemCount = computed(
    () => this.bridge.srItems().filter((i) => i.flags.length > 0).length
  );

  protected setFilter(f: SrFilter): void {
    this.filter.set(f);
  }

  // click a row: the injected script scrolls to the element and flashes it
  protected jump(id: number): void {
    this.bridge.send('sr-focus', { id });
  }

  // what a screen reader would say, for display
  protected speak(i: SrItem): string {
    const level = i.level ? ` level ${i.level}` : '';
    const name = i.name ? `, ${i.name}` : NEEDS_NAME.includes(i.role) ? ', unlabeled' : '';
    const states = i.states.length ? `, ${i.states.join(', ')}` : '';
    return `${i.role}${level}${name}${states}`;
  }

  protected flagText(flag: string): string {
    return FLAG_TEXT[flag] ?? flag;
  }

  protected readAloud(i: SrItem): void {
    if (!this.canSpeak) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(this.speak(i)));
  }
}