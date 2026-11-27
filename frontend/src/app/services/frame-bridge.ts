import { Injectable, effect, inject, signal } from '@angular/core';
import { API_BASE } from '../config';
import { ProxyError, SrItem, TabInfo } from '../models/frame-messages';
import { SimulationStateService } from './simulation-state';

@Injectable({ providedIn: 'root' })
export class FrameBridgeService {
  private readonly state = inject(SimulationStateService);
  private readonly targetOrigin = new URL(API_BASE).origin;
  private frame: HTMLIFrameElement | null = null;

  readonly srItems = signal<SrItem[]>([]);
  readonly tabInfo = signal<TabInfo | null>(null);
  readonly keyboardBlocked = signal(0);
  readonly proxyError = signal<ProxyError | null>(null);

  constructor() {
    window.addEventListener('message', (e) => this.onMessage(e));
    // every settings change goes to the frame
    effect(() => this.send('config', this.state.frameConfig()));
  }

  attach(el: HTMLIFrameElement | null): void {
    this.frame = el;
  }

  send(type: string, payload?: unknown): void {
    this.frame?.contentWindow?.postMessage({ source: 'potg', type, payload }, this.targetOrigin);
  }

  private onMessage(e: MessageEvent): void {
    if (!this.frame || e.source !== this.frame.contentWindow) return; // ignore every other window
    const m = e.data;
    if (m?.source !== 'potg') return;
    switch (m.type) {
      case 'ready':
        this.proxyError.set(null);
        this.srItems.set([]);
        this.tabInfo.set(null);
        this.keyboardBlocked.set(0);
        this.state.currentUrl.set(m.payload?.url ?? '');
        // a fresh page has forgotten the settings
        this.send('config', this.state.frameConfig());
        break;
      case 'sr-items':
        this.srItems.set(m.payload ?? []);
        break;
      case 'taborder':
        this.tabInfo.set(m.payload ?? null);
        break;
      case 'keyboard-blocked':
        this.keyboardBlocked.set(m.payload?.count ?? 0);
        break;
      case 'proxy-error':
        this.proxyError.set(m.payload);
        break;
    }
  }
}