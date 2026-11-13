import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  DESKTOP_FRAME_WIDTH,
  REFLOW_FRAME_WIDTH,
  SimulationStateService,
} from '../../services/simulation-state';

/**
 * Wrapper mode (level 1): the site loads in an iframe and every simulation is
 * applied to the iframe element or to layers placed in front of it.
 *
 * The frame is laid out at a fixed logical width (1280 px, or 320 px for zoom
 * and reflow) and scaled down with a CSS transform when the canvas is narrower,
 * so the site sees a desktop viewport even in a small workspace.
 */
@Component({
  selector: 'app-site-frame',
  templateUrl: './site-frame.html',
  styleUrl: './site-frame.css',
})
export class SiteFrame {
  protected readonly state = inject(SimulationStateService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  private readonly measureEl = viewChild.required<ElementRef<HTMLElement>>('measure');
  private readonly frameEl = viewChild<ElementRef<HTMLIFrameElement>>('siteFrame');

  private readonly available = signal({ w: 0, h: 0 });

  // Only http(s) URLs reach this point (SimulationStateService.loadUrl checks).
  protected readonly safeUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.state.url())
  );

  protected readonly host = computed(() => {
    try {
      return new URL(this.state.url()).host;
    } catch {
      return this.state.url();
    }
  });

  protected readonly logicalWidth = computed(() =>
    this.state.zoomReflow() ? REFLOW_FRAME_WIDTH : DESKTOP_FRAME_WIDTH
  );

  protected readonly scale = computed(() => {
    const w = this.available().w;
    return w > 0 ? Math.min(1, w / this.logicalWidth()) : 1;
  });

  protected readonly logicalHeight = computed(() => {
    const h = this.available().h;
    return h > 0 ? Math.max(360, Math.floor(h / this.scale())) : 640;
  });

  protected readonly sizeLabel = computed(() =>
    this.state.zoomReflow()
      ? `${REFLOW_FRAME_WIDTH} px frame`
      : `${DESKTOP_FRAME_WIDTH} px desktop frame, shown at ${Math.round(this.scale() * 100)}%`
  );

  /** Dark ring with a clear center, driven by the "clear area" slider. */
  protected readonly tunnelMask = computed(() => {
    const edge = this.state.tunnelSize();
    return `radial-gradient(ellipse at 50% 50%, transparent ${edge * 0.6}%, rgba(8, 8, 8, 0.92) ${edge}%)`;
  });

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        this.available.set({ w: Math.floor(width), h: Math.floor(height) });
      });
      observer.observe(this.measureEl().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Puts keyboard focus inside the site so Tab and arrow keys work right away. */
  protected focusSite(): void {
    this.frameEl()?.nativeElement.focus();
  }
}
