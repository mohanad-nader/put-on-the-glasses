import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FrameBridgeService } from '../../services/frame-bridge';
import { SimulationStateService } from '../../services/simulation-state';
import { MotorControls } from './motor-controls';

describe('MotorControls', () => {
  let state: SimulationStateService;
  let fixture: ReturnType<typeof TestBed.createComponent<MotorControls>>;
  let root: HTMLElement;
  const blocked = signal(0);

  beforeEach(async () => {
    blocked.set(0);
    await TestBed.configureTestingModule({
      imports: [MotorControls],
      // the real bridge listens to window messages, a signal is all this component reads
      providers: [{ provide: FrameBridgeService, useValue: { keyboardBlocked: blocked } }],
    }).compileComponents();
    state = TestBed.inject(SimulationStateService);
    fixture = TestBed.createComponent(MotorControls);
    await fixture.whenStable();
    root = fixture.nativeElement;
  });

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const switchFor = (text: string) =>
    Array.from(root.querySelectorAll<HTMLInputElement>('input[role="switch"]')).find((i) =>
      i.closest('label')!.textContent!.includes(text),
    )!;

  it('turns No keyboard on when its switch is clicked', async () => {
    switchFor('No keyboard').click();
    await flush();
    expect(state.noKeyboard()).toBe(true);
  });

  it('shows the blocked-key counter only while No keyboard is on', async () => {
    expect(root.querySelector('.counter')).toBeNull();
    state.setNoKeyboard(true);
    blocked.set(7);
    await flush();
    expect(root.querySelector('.counter')!.textContent).toContain('7');
  });

  it('turns Hand tremor on and shows the strength slider', async () => {
    expect(root.querySelector('input[type="range"]')).toBeNull();
    switchFor('Hand tremor').click();
    await flush();
    expect(state.tremor()).toBe(true);
    expect(root.querySelector('input[type="range"]')).not.toBeNull();
  });

  it('changes the strength from the slider and clamps it to 30', async () => {
    state.toggleTremor();
    await flush();
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]')!;
    slider.value = '20';
    slider.dispatchEvent(new Event('input'));
    expect(state.tremorAmp()).toBe(20);
    state.setTremorAmp(99);
    expect(state.tremorAmp()).toBe(30);
  });
});
