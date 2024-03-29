import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, filter, finalize, mergeMap, retry, switchMap, take, tap, timeout } from 'rxjs/operators';
import { SnackbarService } from '../shared/_services/snackbar/snackbar.service';
import { AuthenticationService } from '../authentication/_services/auth/authentication.service';
import { SpinnerService } from '../shared/_services/spinner/spinner.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { TokenService } from '../authentication/_services/token/token.service';
import { EventHandlingService } from '../shared/_services/event/event-handling.service';

const TOKEN_HEADER_KEY = 'Authorization';
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  baseUrl = environment.apiBaseUrl;
  eventHandler: any;

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  SERVER_ERROR = {
    "status": "Error",
    "eventCode": "NADL-SERVER-ERROR",
    "message": "Respective error message will be returned when there are any server errors of NADL"
  }

  constructor(private snackbar: SnackbarService,
    private authService: AuthenticationService,
    private tokenService: TokenService,
    private router: Router,
    private eventService: EventHandlingService,
    private spinnerService: SpinnerService) {
  }

  accessExpired: boolean = false;
  token: any
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.spinnerService.show()
    let authReq = req;
    this.token = this.tokenService.getToken();

    // if (this.token != null) {
    //   authReq = this.addTokenHeader(req, this.token);
    // }


    if (!navigator.onLine) {
      this.eventService.sendDataToParentEvent(this.SERVER_ERROR);
      return throwError(new Error('Unable to connect to the nadl server at this time, Please check your connection or try again later'));
    } else {
      return next.handle(authReq)
        .pipe(
          catchError(error => {
            if (error instanceof HttpErrorResponse) {
              if (error.status === 401) {
                // if ((error.url === this.baseUrl + '/individuals/' + sessionStorage.getItem('CUSTOMER_ID') + '/access-token' && error.status === 401)) {
                //   return this.handle401Error(authReq, next);
                // }
                return this.handle401Error(authReq, next);
              } else if (error.status === 500) {
                return throwError(error.error)
              } else if (error.status === 400) {
                if (error.error.culprit === 'Session') {
                  this.snackbar.error('Session Expired');
                  this.clearSessionStorage()
                  this.router.navigate(['/authentication']);
                }
              } else {
                return throwError(error.error);
              }
              return throwError(error);
            } else if (error instanceof TimeoutError) {
              this.snackbar.error('Unable to process your request at this point of time, kindly try after sometime')
              this.eventService.sendDataToParentEvent(this.SERVER_ERROR);
              return throwError('Timeout Exception');
            }
          }),
          finalize(() => {
            this.spinnerService.hide();
          }),
          timeout(65000))
    }
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const token = this.tokenService.getRefreshToken();
      if (token) {
        return this.authService.refreshToken().pipe(
          switchMap((token: any) => {
            this.isRefreshing = false;

            this.tokenService.saveToken(token);
            this.refreshTokenSubject.next(token);

            // return next.handle(request);
            return next.handle(this.addTokenHeader(request, token));
          }),
          catchError((err) => {
            this.isRefreshing = false;

            // this.tokenService.signOut();
            return throwError(err);
          })
        );
      }
    }
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => next.handle(request))
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string) {
    return request.clone({ headers: request.headers.set(TOKEN_HEADER_KEY, 'Bearer ' + token) });
  }

  private clearSessionStorage() {
    window.sessionStorage.clear();
  }
}
