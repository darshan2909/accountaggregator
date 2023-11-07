import { Injectable } from '@angular/core';
import {Subject} from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
isLoading = new Subject<boolean>();
private requestCount = 0;
  constructor() { }
  show() {
    if (this.requestCount === 0) {
      this.isLoading.next(true);
    }
    this.requestCount++;
  }

  hide() {
    this.requestCount--;
    if (this.requestCount === 0) {
      this.isLoading.next(false);
    }
}
}