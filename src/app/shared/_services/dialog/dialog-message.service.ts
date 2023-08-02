import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmComponent } from '../../_components/dialog-message/confirm/confirm.component';

@Injectable({
  providedIn: 'root'
})
export class DialogMessageService {

  constructor(private dialog: MatDialog) { }

  confirmDialog(data: any): Observable<any> {
    return this.dialog.open(ConfirmComponent, {
      data,
      // width: '40%',
      // disableClose: true
    })
      .afterClosed();
  }
}
