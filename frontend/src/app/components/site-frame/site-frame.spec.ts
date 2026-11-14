import { TestBed } from '@angular/core/testing';
import { SimulationStateService } from '../../services/simulation-state';
import { SiteFrame } from './site-frame';

describe('SiteFrame', () => {
  let state: SimulationStateService;
  let fixture: ReturnType<typeof TestBed.createComponent<SiteFrame>>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SiteFrame] }).compileComponents();
    state = TestBed.inject(SimulationStateService);
    state.loadUrl('example.com');
    fixture = TestBed.createComponent(SiteFrame);
    await fixture.whenStable();
    root = fixture.nativeElement;
  });

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const iframe = () => root.querySelector('iframe')!;
  // The filter sits on the iframe, or on the transparent .lens layer in front of it.
  const appliedStyle = () =>
    (iframe().getAttribute('style') ?? '') + (root.querySelector('.lens')?.getAttribute('style') ?? '');

  it('loads the site in a sandboxed, titled iframe', () => {
    expect(iframe().getAttribute('src')).toBe('https://example.com/');
    expect(iframe().getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe().getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(iframe().title).toContain('example.com');
  });

  it('applies no filter by default', () => {
    expect(iframe().style.filter).toBe('none');
    expect(root.querySelector('.mask')).toBeNull();
    expect(root.querySelector('.blocker')).toBeNull();
  });

  it('applies the color blindness filter to the iframe', async () => {
    state.colorBlindness.set('protanopia');
    await flush();
    expect(appliedStyle()).toMatch(/url\("?#cvd-protanopia"?\)/);
  });

  it('applies blur and contrast, and draws the tunnel mask, for low vision', async () => {
    state.lowVision.set(true);
    await flush();
    expect(appliedStyle()).toContain('blur(1.6px)');
    expect(appliedStyle()).toContain('contrast(0.7)');
    expect(root.querySelector('.mask')).not.toBeNull();
  });

  it('omits the tunnel mask when tunnel vision is off', async () => {
    state.lowVision.set(true);
    state.tunnelVision.set(false);
    await flush();
    expect(root.querySelector('.mask')).toBeNull();
  });

  it('narrows the frame to 320 px for zoom and reflow', async () => {
    expect(root.querySelector<HTMLElement>('.artboard')!.style.width).toBe('1280px');
    state.zoomReflow.set(true);
    await flush();
    expect(root.querySelector<HTMLElement>('.artboard')!.style.width).toBe('320px');
    expect(root.querySelector('.flabel')?.textContent).toContain('320 px');
  });

  it('puts a blocking layer in front of the site when the mouse is off', async () => {
    state.setNoMouse(true);
    await flush();
    const blocker = root.querySelector('.blocker')!;
    expect(blocker).not.toBeNull();
    const artboard = root.querySelector('.artboard')!;
    expect(artboard.lastElementChild).toBe(blocker);
    expect(root.querySelector('.notice button')).not.toBeNull();
  });

  it('moves keyboard focus into the frame on request', async () => {
    state.setNoMouse(true);
    await flush();
    const spy = vi.spyOn(iframe(), 'focus');
    root.querySelector<HTMLButtonElement>('.notice button')!.click();
    expect(spy).toHaveBeenCalled();
  });
});
