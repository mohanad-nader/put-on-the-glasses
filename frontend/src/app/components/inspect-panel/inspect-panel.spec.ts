import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SrItem } from '../../models/frame-messages';
import { FrameBridgeService } from '../../services/frame-bridge';
import { SimulationStateService } from '../../services/simulation-state';
import { InspectPanel } from './inspect-panel';

const ITEMS: SrItem[] = [
  { id: 1, role: 'heading', name: 'Welcome', level: 1, states: [], flags: [], tag: 'h1' },
  { id: 2, role: 'link', name: 'click here', states: [], flags: ['generic-link'], tag: 'a' },
  { id: 3, role: 'button', name: '', states: [], flags: ['no-name'], tag: 'button' },
  { id: 4, role: 'navigation', name: 'Main', states: [], flags: [], tag: 'nav' },
];

describe('InspectPanel', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<InspectPanel>>;
  let root: HTMLElement;
  let bridge: FrameBridgeService;
  let state: SimulationStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InspectPanel] }).compileComponents();
    bridge = TestBed.inject(FrameBridgeService);
    state = TestBed.inject(SimulationStateService);
    fixture = TestBed.createComponent(InspectPanel);
    await fixture.whenStable();
    root = fixture.nativeElement;
  });

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  // the component's members are protected, tests reach them through a loose view
  const inst = () => fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => unknown> & {
    shown: () => SrItem[];
    filter: { set: (f: string) => void };
  };

  const rows = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button.row'));
  const chip = (label: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.chip')).find((b) =>
      b.textContent?.trim().startsWith(label)
    )!;
  const switchFor = (text: string) =>
    Array.from(root.querySelectorAll<HTMLLabelElement>('label.sw-pill'))
      .find((l) => l.textContent?.includes(text))!
      .querySelector('input')!;

  async function turnViewOn(items: SrItem[] = ITEMS) {
    state.screenReader.set(true);
    bridge.srItems.set(items);
    await flush();
  }

  it('shows the empty state and the proxy hint while the view is off', async () => {
    await flush();
    expect(root.textContent).toContain('Turn the view on to list what a screen reader would announce.');
    expect(root.textContent).toContain('This needs proxy mode, it will switch automatically.');
    expect(rows().length).toBe(0);
  });

  it('turning the switch on turns the mode on and switches to proxy mode', async () => {
    switchFor('Screen-reader view').click();
    await flush();
    expect(state.screenReader()).toBe(true);
    expect(state.viewerMode()).toBe('proxy');
    expect(root.textContent).toContain('Waiting for the page to report its content.');
  });

  it('lists every item with a count line', async () => {
    await turnViewOn();
    expect(rows().length).toBe(4);
    expect(root.querySelector('.count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('4 items, 2 problems');
  });

  it('filters by headings', async () => {
    await turnViewOn();
    chip('Headings').click();
    await flush();
    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('heading level 1, Welcome');
    expect(chip('Headings').getAttribute('aria-pressed')).toBe('true');
  });

  it('filters by landmarks and by links', async () => {
    await turnViewOn();
    chip('Landmarks').click();
    await flush();
    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining('navigation, Main')]);
    chip('Links').click();
    await flush();
    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('click here');
  });

  it('the problems filter keeps only flagged items and shows plain flag wording', async () => {
    await turnViewOn();
    chip('Problems').click();
    await flush();
    expect(rows().length).toBe(2);
    const text = root.querySelector('.items')!.textContent!;
    expect(text).toContain('generic link text');
    expect(text).toContain('no accessible name');
  });

  it('says "nothing matches" when a filter has no result', async () => {
    await turnViewOn([ITEMS[0]]);
    chip('Problems').click();
    await flush();
    expect(root.textContent).toContain('Nothing matches this filter.');
  });

  it('speak describes a heading and an unlabeled button', () => {
    const speak = (fixture.componentInstance as unknown as { speak: (i: SrItem) => string }).speak;
    expect(speak(ITEMS[0])).toBe('heading level 1, Welcome');
    expect(speak(ITEMS[2])).toBe('button, unlabeled');
    // a landmark without a name is not "unlabeled", it simply has no name to announce
    expect(speak({ id: 9, role: 'main', name: '', states: [], flags: [], tag: 'main' })).toBe('main');
    // states are appended
    expect(speak({ id: 8, role: 'checkbox', name: 'News', states: ['checked', 'required'], flags: [], tag: 'input' })).toBe(
      'checkbox, News, checked, required'
    );
  });

  it('clicking a row sends sr-focus with that item id', async () => {
    const send = vi.spyOn(bridge, 'send');
    await turnViewOn();
    rows()[1].click();
    expect(send).toHaveBeenCalledWith('sr-focus', { id: 2 });
  });

  it('every row is a real button', async () => {
    await turnViewOn();
    expect(root.querySelectorAll('.items li').length).toBe(4);
    rows().forEach((r) => expect(r.tagName).toBe('BUTTON'));
  });

  it('tab order: shows the count and the warnings from the frame', async () => {
    state.tabOrder.set(true);
    bridge.tabInfo.set({
      count: 12,
      warnings: [{ n: 3, reason: 'positive tabindex (5)', label: 'button: Buy' }],
    });
    await flush();
    const text = root.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('12 tab stops, 1 warnings');
    expect(text).toContain('positive tabindex (5)');
    expect(text).toContain('button: Buy');
  });

  it('tab order: explains the empty state and the waiting state', async () => {
    await flush();
    expect(root.textContent).toContain('Turn the overlay on to number every stop');
    state.tabOrder.set(true);
    await flush();
    expect(root.textContent).toContain('Waiting for the page to report its tab stops.');
  });

  it('the tab-order switch turns the mode on and switches to proxy mode', async () => {
    switchFor('Tab-order overlay').click();
    await flush();
    expect(state.tabOrder()).toBe(true);
    expect(state.viewerMode()).toBe('proxy');
  });

  it('keeps its helper members reachable for the template', () => {
    expect(inst()).toBeTruthy();
  });
});