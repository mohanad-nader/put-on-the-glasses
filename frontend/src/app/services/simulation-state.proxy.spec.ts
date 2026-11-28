import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SimulationStateService } from './simulation-state';

describe('SimulationStateService (proxy modes)', () => {
  const make = () => TestBed.inject(SimulationStateService);

  it('needsProxy is false by default', () => {
    expect(make().needsProxy()).toBe(false);
  });

  it('needsProxy is true for each proxy-only mode', () => {
    const s = make();
    s.setNoKeyboard(true);
    expect(s.needsProxy()).toBe(true);
    s.reset();
    s.toggleTremor();
    expect(s.needsProxy()).toBe(true);
    s.reset();
    s.toggleScreenReader();
    expect(s.needsProxy()).toBe(true);
    s.reset();
    s.toggleTabOrder();
    expect(s.needsProxy()).toBe(true);
  });

  it('toggleNoKeyboard turns no mouse off', () => {
    const s = make();
    s.setNoMouse(true);
    s.toggleNoKeyboard();
    expect(s.noKeyboard()).toBe(true);
    expect(s.noMouse()).toBe(false);
  });

  it('turning on a proxy-only mode switches the viewer to proxy', () => {
    const s = make();
    expect(s.viewerMode()).toBe('wrapper');
    s.toggleTremor();
    expect(s.viewerMode()).toBe('proxy');
  });

  it('setTremorAmp clamps between 0 and 30', () => {
    const s = make();
    s.setTremorAmp(99);
    expect(s.tremorAmp()).toBe(30);
    s.setTremorAmp(-5);
    expect(s.tremorAmp()).toBe(0);
  });

  it('reset restores the new signals and the viewer mode', () => {
    const s = make();
    s.toggleTremor();
    s.toggleScreenReader();
    s.toggleTabOrder();
    s.setTremorAmp(20);
    s.reset();
    expect(s.tremor()).toBe(false);
    expect(s.screenReader()).toBe(false);
    expect(s.tabOrder()).toBe(false);
    expect(s.tremorAmp()).toBe(8);
    expect(s.viewerMode()).toBe('wrapper');
  });

  it('frameConfig has the shape the injected script expects', () => {
    const s = make();
    s.toggleTremor();
    s.setTremorAmp(12);
    expect(s.frameConfig()).toEqual({
      noKeyboard: false,
      tremor: { on: true, amp: 12 },
      screenReader: false,
      tabOrder: false,
    });
  });
});