import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevOnlyComponent } from './dev-only.component';

describe('DevOnlyComponent', () => {
  let component: DevOnlyComponent;
  let fixture: ComponentFixture<DevOnlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DevOnlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DevOnlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
