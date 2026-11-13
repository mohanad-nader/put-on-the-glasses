import { TestBed } from '@angular/core/testing';
import { SimulationStateService } from '../../services/simulation-state';
import { UrlForm } from './url-form';

describe('UrlForm', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<UrlForm>>;
  let root: HTMLElement;
  let state: SimulationStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UrlForm] }).compileComponents();
    state = TestBed.inject(SimulationStateService);
    fixture = TestBed.createComponent(UrlForm);
    await fixture.whenStable();
    root = fixture.nativeElement;
  });

  function type(value: string) {
    const input = root.querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('saves a valid address and emits submitted', async () => {
    let emitted = 0;
    fixture.componentInstance.submitted.subscribe(() => emitted++);
    type('example.com');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(state.url()).toBe('https://example.com/');
    expect(emitted).toBe(1);
  });

  it('shows an alert and does not emit for an invalid address', async () => {
    let emitted = 0;
    fixture.componentInstance.submitted.subscribe(() => emitted++);
    type('ftp://example.com');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(emitted).toBe(0);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('http');
    expect(root.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });
});
