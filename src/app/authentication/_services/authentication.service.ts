import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SnackbarService } from 'src/app/shared/_services/snackbar/snackbar.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  baseUrl = environment.apiBaseUrl;

  accessToken1 = localStorage.getItem('ACCESS_TOKEN');
  headers_object = new HttpHeaders()
    .set("X-API-KEY", environment.apiKey)
    .set('Content-Type', 'application/json')
    .set('Authorization', "Bearer " + this.accessToken1);
    
  router: any;
  accessToken: any;
  refreshToken: any;

  constructor(private http: HttpClient) { }

  generateAuthToken() {
    let customerId = sessionStorage.getItem('CUSTOMER_ID');
    let accessToken = localStorage.getItem('ACCESS_TOKEN');
    let refreshToken = localStorage.getItem('REFRESH_TOKEN');

    let headers_object = new HttpHeaders()
      .set("X-API-KEY", environment.apiKey)
      .set('Content-Type', 'application/json')
      .set('Authorization', "Bearer " + accessToken)

    console.log(headers_object)

    return this.http.post(this.baseUrl + '/individuals/' + customerId + '/access-token', '', { headers: headers_object, observe: "response" })
      .subscribe((res: any) => {
        console.log('access token response', res)
        this.accessToken = res.headers.get('Access-Token');
        this.refreshToken = res.headers.get('Refresh-Token');

        localStorage.setItem('ACCESS_TOKEN', this.accessToken)
        localStorage.setItem('REFRESH_TOKEN', this.refreshToken)
      })
  }

  getUserDetails(customerId) {
    return this.http.get(this.baseUrl + '/individuals/' + customerId, { headers: this.headers_object })
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
    return this.http.post(this.baseUrl + '/customers/fiu/register', data, { headers: this.headers_object })
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
