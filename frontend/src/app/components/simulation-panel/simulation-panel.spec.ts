import { TestBed } from '@angular/core/testing';
import { SimulationStateService } from '../../services/simulation-state';
import { SimulationPanel } from './simulation-panel';

describe('SimulationPanel', () => {
  let root: HTMLElement;
  let state: SimulationStateService;
  let fixture: ReturnType<typeof TestBed.createComponent<SimulationPanel>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SimulationPanel] }).compileComponents();
    state = TestBed.inject(SimulationStateService);
    fixture = TestBed.createComponent(SimulationPanel);
    await fixture.whenStable();
    root = fixture.nativeElement;
  });

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function switchFor(text: string): HTMLInputElement {
    const label = Array.from(root.querySelectorAll<HTMLLabelElement>('label.sw-pill')).find((l) =>
      l.textContent?.includes(text)
    );
    return label!.querySelector('input')!;
  }

  it('lists a typical option plus the four color blindness types', () => {
    const labels = Array.from(root.querySelectorAll('.crow b')).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Typical', 'Protanopia', 'Deuteranopia', 'Tritanopia', 'Achromatopsia']);
  });

  it('selects a color blindness type', async () => {
    const radios = root.querySelectorAll<HTMLInputElement>('input[name="cb"]');
    radios[2].click();
    await flush();
    expect(state.colorBlindness()).toBe('deuteranopia');
    expect(radios[2].checked).toBe(true);
  });

  it('shows low vision sliders only while low vision is on', async () => {
    expect(root.querySelector('#lv-blur')).toBeNull();
    switchFor('Low vision').click();
    await flush();
    expect(state.lowVision()).toBe(true);
    expect(root.querySelector('#lv-blur')).not.toBeNull();
    expect(root.querySelector('#lv-tunnel')).not.toBeNull();
  });

  it('updates blur from its slider', async () => {
    switchFor('Low vision').click();
    await flush();
    const slider = root.querySelector<HTMLInputElement>('#lv-blur')!;
    slider.value = '4';
    slider.dispatchEvent(new Event('input'));
    expect(state.blur()).toBe(4);
  });

  it('toggles zoom and reflow and no mouse', async () => {
    switchFor('Zoom and reflow').click();
    switchFor('No mouse').click();
    await flush();
    expect(state.zoomReflow()).toBe(true);
    expect(state.noMouse()).toBe(true);
  });

  it('exposes switches with the switch role', () => {
    expect(switchFor('No mouse').getAttribute('role')).toBe('switch');
  });
});
