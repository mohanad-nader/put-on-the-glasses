import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defines one SVG filter per color blindness type', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    for (const id of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']) {
      expect(root.querySelector(`filter#cvd-${id}`)).not.toBeNull();
    }
  });

  it('has a skip link and a focusable main landmark', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a.skip')).not.toBeNull();
    expect(root.querySelector('main#main')?.getAttribute('tabindex')).toBe('-1');
  });
});
