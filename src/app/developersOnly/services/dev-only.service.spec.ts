import { TestBed } from '@angular/core/testing';

import { DevOnlyService } from './dev-only.service';

describe('DevOnlyService', () => {
  let service: DevOnlyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DevOnlyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
