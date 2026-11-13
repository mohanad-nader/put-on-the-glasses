import { TestBed } from '@angular/core/testing';
import { SimulationState } from './simulation-state';

describe('SimulationState', () => {
  let service: SimulationState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimulationState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
