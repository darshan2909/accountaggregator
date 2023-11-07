import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SnackbarService } from 'src/app/shared/_services/snackbar/snackbar.service';
import { environment } from 'src/environments/environment';
import { TokenService } from '../token/token.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};
@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  baseUrl = environment.apiBaseUrl;

  // accessToken1 = localStorage.getItem('ACCESS_TOKEN');
  accessToken1 = this.tokenService.getToken();

  headers_object = new HttpHeaders()
    .set("X-API-KEY", environment.apiKey)
    .set('Content-Type', 'application/json')
    .set('Authorization', "Bearer " + this.accessToken1);

  accessToken: any;

  constructor(private http: HttpClient,
    private tokenService: TokenService) { }

  refreshTokenNew() {
    let customerId = sessionStorage.getItem('CUSTOMER_ID');
    return this.http.post(this.baseUrl + '/individuals/' + customerId + '/access-token', '').pipe(
      map((res: any) => {
        return res.headers.get('Access-Token');
      })
    );
  }

  refreshToken(): Observable<any> {
    let customerId = sessionStorage.getItem('CUSTOMER_ID');
    // let refreshToken = localStorage.getItem('REFRESH_TOKEN');
    let refreshToken = this.tokenService.getRefreshToken()
    const headers_object = new HttpHeaders()
      .set("X-API-KEY", environment.apiKey)
      .set('Content-Type', 'application/json')
      .set('Authorization', "Bearer " + refreshToken);
    return this.http.post(this.baseUrl + '/individuals/' + customerId + '/access-token', '', { headers: headers_object, observe: 'response' })
      .pipe(
        tap((res: any) => {
          let token = res.headers.get('Access-Token');
        }),
        map((res: any) => {
          if (res.error) {
            return throwError(res.body.errors);
          } else {
            return res.headers.get('Access-Token');
          }
        }),
      )
  }

  clearUserData() {
    // this.userData = new User();
    // this.accessToken = '';
    // localStorage.removeItem(environment.refreshToken);
    // sessionStorage.removeItem(environment.customerId);
    // localStorage.clear();
    // this.deeplinkingParam = new DeeplinkingParam();
    // this.user = '';
  }

  validateFiuUser(fiuQueryParams) {
    return this.http.post(this.baseUrl + '/customers/fiu/validate', fiuQueryParams, { headers: this.headers_object })
  }

  smsRedirectUrl(smsId) {
    return this.http.get(this.baseUrl + '/customers/fiu/' + smsId, { headers: this.headers_object })
  }

  requestOtp(body) {
    return this.http.post(this.baseUrl + '/mobile-validations', body, { headers: this.headers_object })
  }

  validateOtp(id, otpValidateObject) {
    return this.http.post(this.baseUrl + '/mobile-validations/' + id + '/challenge-response', otpValidateObject, { headers: this.headers_object })
  }

  login(data) {
    return this.http.post(this.baseUrl + '/customers/fiu/login', data, { headers: this.headers_object, observe: "response" })
  }

  register(data) {
    return this.http.post(this.baseUrl + '/customers/fiu/register', data, { headers: this.headers_object, observe: "response" })
  }

  resend(otpResponseData) {
    var vua = ''
    return this.http.post(this.baseUrl + '/mobile-validations/resend-otp/' + otpResponseData.id, '', { headers: this.headers_object })

    // response:
    // {
    //   "id": "01H59FXYHF2JVAVKT71NHREX78",
    //     "object": "MobileValidation",
    //       "mobile_number": "FKuV/0wV+mcaMN3elO4FCA==",
    //         "is_validated": false,
    //           "created_On": "2023-07-14T11:33:09.000Z",
    //             "modified_On": "2023-07-14T11:35:13.476Z"
    // }
  }

}
