import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FrameBridgeService } from './frame-bridge';
import { SimulationStateService } from './simulation-state';

describe('FrameBridgeService', () => {
  let bridge: FrameBridgeService;
  let state: SimulationStateService;
  let iframe: HTMLIFrameElement;

  const fromFrame = (type: string, payload?: unknown, source: MessageEventSource | null = iframe.contentWindow) =>
    window.dispatchEvent(
      new MessageEvent('message', { data: { source: 'potg', type, payload }, source })
    );

  beforeEach(() => {
    bridge = TestBed.inject(FrameBridgeService);
    state = TestBed.inject(SimulationStateService);
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    bridge.attach(iframe);
  });

  afterEach(() => {
    bridge.attach(null);
    iframe.remove();
  });

  it('stores screen-reader items sent by the frame', () => {
    const items = [{ id: 1, role: 'heading', name: 'Hi', states: [], flags: [], tag: 'h1' }];
    fromFrame('sr-items', items);
    expect(bridge.srItems()).toEqual(items);
  });

  it('ignores messages from another window', () => {
    fromFrame('sr-items', [{ id: 1 }], window);
    expect(bridge.srItems()).toEqual([]);
  });

  it('ready resets the signals and updates the current URL', () => {
    fromFrame('keyboard-blocked', { count: 5 });
    fromFrame('ready', { url: 'https://example.com/x' });
    expect(bridge.keyboardBlocked()).toBe(0);
    expect(bridge.srItems()).toEqual([]);
    expect(state.currentUrl()).toBe('https://example.com/x');
  });

  it('proxy-error fills proxyError', () => {
    fromFrame('proxy-error', { code: 'BLOCKED_URL', message: 'blocked' });
    expect(bridge.proxyError()?.code).toBe('BLOCKED_URL');
  });
});