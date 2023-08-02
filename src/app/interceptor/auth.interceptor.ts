import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { SnackbarService } from '../shared/_services/snackbar/snackbar.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private snackbar: SnackbarService) {
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request)
      .pipe(
        retry(1),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = '';
          if (error.error instanceof ErrorEvent) {
            // client-side error
            console.log('client side')
            errorMessage = `${error.error.message}`;
          } else {
            // server-side error
            // errorMessage = `${error.status}\nMessage: ${error.user_friendly_message}`;
            errorMessage = `${error.error.user_friendly_message}`;
          }
          this.snackbar.error(errorMessage)
          return throwError(errorMessage);
        })
      )
  }
}
