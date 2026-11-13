import { Component } from '@angular/core';
import { CVD_OPTIONS, cvdFilterId, toFeColorMatrix } from '../../data/cvd-types';

/**
 * Shared SVG definitions, rendered once in the app shell:
 * the glasses logo symbol and one color-matrix filter per color blindness type.
 * CSS `filter: url(#cvd-...)` anywhere in the page can then reference them.
 */
@Component({
  selector: 'app-svg-defs',
  templateUrl: './svg-defs.html',
  styles: `
    :host {
      display: block;
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }
  `,
})
export class SvgDefs {
  protected readonly filters = CVD_OPTIONS.filter((o) => o.matrix).map((o) => ({
    id: cvdFilterId(o.id),
    values: toFeColorMatrix(o.matrix!),
  }));
}
