import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { v1 as uuidv1 } from 'uuid';
import { shareReplay } from 'rxjs/operators';
import { TokenService } from 'src/app/authentication/_services/token/token.service';

@Injectable({
  providedIn: 'root'
})
export class ConsentService {

  baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient,
    private tokenService: TokenService) { }

  accessToken = this.tokenService.getToken();
  headers_object = new HttpHeaders()
    .set("X-API-KEY", environment.apiKey)
    .set('Content-Type', 'application/json')
    .set('Authorization', "Bearer " + this.accessToken)
    .set('Transaction-Id', uuidv1())

  getUserDetails(customerId) {
    return this.http.get(this.baseUrl + '/individuals/' + customerId, { headers: this.headers_object })
  }

  /*======================================== FIP & FIU =========================================*/
  getFipLists() {
    return this.http.get(this.baseUrl + '/FIPs', { headers: this.headers_object })
  }

  getFiuLists() {
    return this.http.get(this.baseUrl + '/FIU/get', { headers: this.headers_object })
  }

  /*======================================== CONSENT DETAILS =========================================*/
  getMultipleConsentDetails(consentHandleId) {
    return this.http.post(this.baseUrl + '/consents/getByHandles', { "handleList": consentHandleId }, { headers: this.headers_object })
  }

  getConsentDetails(consentParams) {
    return this.http.get(this.baseUrl + '/consents', { params: consentParams, headers: this.headers_object })
  }

  approveConsent(consentHandleId, data) {
    return this.http.post(this.baseUrl + '/consent-requests/' + consentHandleId + '/approve', data, { headers: this.headers_object })
  }

  approveMultipleConsent(data) {
    return this.http.post(this.baseUrl + '/consent-requests/approve', data, { headers: this.headers_object })
  }

  rejectReason() {
    return this.http.get(this.baseUrl + '/reject-reasons', { headers: this.headers_object })
  }

  rejectConsent(data, consentHandle) {
    return this.http.post(this.baseUrl + '/consent-requests/' + consentHandle + '/reject', data, { headers: this.headers_object })
  }

  rejectMultipleConsent(data) {
    return this.http.post(this.baseUrl + '/consent-requests/reject', data, { headers: this.headers_object })
  }

  /*======================================== ACCOUNTS / ASSETS =========================================*/
  getLinkedAccounts() {
    return this.http.get(this.baseUrl + '/linked-accounts', { headers: this.headers_object })
  }

  getAccountCategory() {
    return this.http.get(this.baseUrl + '/accounts/categories', { headers: this.headers_object })
  }

  discoverAccount(reqData) {
    return this.http.post(this.baseUrl + '/accounts/discover', reqData, { headers: this.headers_object })
  }

  autoAccountDiscovery(data) {
    return this.http.post(this.baseUrl + '/accounts/auto-discover', data, { headers: this.headers_object })
  }

  accountLink(data) {
    return this.http.post(this.baseUrl + '/accounts/link', data, { headers: this.headers_object })
  }

  confirmAccountLink(data) {
    return this.http.post(this.baseUrl + '/accounts/confirm-link', data, { headers: this.headers_object })
  }
}
