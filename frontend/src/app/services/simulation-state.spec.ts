import { TestBed } from '@angular/core/testing';
import { SimulationStateService } from './simulation-state';

describe('SimulationStateService', () => {
  let service: SimulationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimulationStateService);
  });

  describe('loadUrl', () => {
    it('adds https:// when the protocol is missing', () => {
      expect(service.loadUrl('example.com')).toBe(true);
      expect(service.url()).toBe('https://example.com/');
    });

    it('keeps an explicit http address', () => {
      service.loadUrl('http://example.com/page');
      expect(service.url()).toBe('http://example.com/page');
    });

    it('rejects empty input', () => {
      expect(service.loadUrl('   ')).toBe(false);
      expect(service.urlError()).not.toBe('');
      expect(service.url()).toBe('');
    });

    it('rejects non-http schemes and script URLs', () => {
      expect(service.loadUrl('javascript:alert(1)')).toBe(false);
      expect(service.loadUrl('data://text/html,hi')).toBe(false);
      expect(service.loadUrl('ftp://example.com')).toBe(false);
      expect(service.url()).toBe('');
    });

    it('clears the error after a valid address', () => {
      service.loadUrl('');
      service.loadUrl('example.com');
      expect(service.urlError()).toBe('');
    });
  });

  describe('frameFilter', () => {
    it('is "none" with no simulation', () => {
      expect(service.frameFilter()).toBe('none');
    });

    it('uses the SVG filter for the chosen color blindness type', () => {
      service.colorBlindness.set('deuteranopia');
      expect(service.frameFilter()).toBe('url(#cvd-deuteranopia)');
    });

    it('adds blur and contrast for low vision', () => {
      service.lowVision.set(true);
      service.blur.set(3);
      service.contrast.set(0.5);
      expect(service.frameFilter()).toBe('blur(3px) contrast(0.5)');
    });

    it('stacks color blindness and low vision', () => {
      service.colorBlindness.set('tritanopia');
      service.lowVision.set(true);
      expect(service.frameFilter()).toBe('url(#cvd-tritanopia) blur(1.6px) contrast(0.7)');
    });
  });

  it('summarizes the active modes', () => {
    expect(service.activeSummary()).toBe('Normal vision');
    service.colorBlindness.set('protanopia');
    service.zoomReflow.set(true);
    service.setNoMouse(true);
    expect(service.activeSummary()).toBe('Protanopia + Zoom and reflow + No mouse');
  });

  it('never allows no mouse and no keyboard together', () => {
    service.setNoMouse(true);
    service.setNoKeyboard(true);
    expect(service.noMouse()).toBe(false);
    expect(service.noKeyboard()).toBe(true);
    service.setNoMouse(true);
    expect(service.noKeyboard()).toBe(false);
  });

  it('reset turns every simulation off but keeps the site', () => {
    service.loadUrl('example.com');
    service.colorBlindness.set('achromatopsia');
    service.lowVision.set(true);
    service.blur.set(5);
    service.tunnelVision.set(false);
    service.zoomReflow.set(true);
    service.setNoMouse(true);
    service.reset();
    expect(service.hasActiveMode()).toBe(false);
    expect(service.blur()).toBe(1.6);
    expect(service.tunnelVision()).toBe(true);
    expect(service.url()).toBe('https://example.com/');
  });
});
