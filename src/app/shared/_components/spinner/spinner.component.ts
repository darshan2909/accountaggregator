import {Component, Inject} from '@angular/core';
import { Router} from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { SpinnerService } from '../../_services/spinner/spinner.service';

@Component({
  selector: 'app-spinner',
  templateUrl: 'spinner.component.html',
  styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent {

  color = "primary"
  mode = "indeterminate"
  value = 50
  isLoading: Subject<boolean> = this.spinnerService.isLoading;
  constructor(
    private router: Router,
    private spinnerService: SpinnerService,
    @Inject(DOCUMENT) private document: Document
  ) {

  }
}