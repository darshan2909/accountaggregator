import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { AesEncryptionService } from 'src/app/shared/_services/aes-encryption.service';
import { AuthenticationService } from '../../_services/auth/authentication.service';
import { take } from 'rxjs/operators';
import { SnackbarService } from 'src/app/shared/_services/snackbar/snackbar.service';
import { TokenService } from '../../_services/token/token.service';
import { ChangeDetectorRef } from '@angular/core';
import { EventHandlingService } from 'src/app/shared/_services/event/event-handling.service';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  private loginSuccessEventCode = 'USER-LOGIN-SUCCESS';
  private loginFailureEventCode = 'USER-LOGIN—FAILED';
  private existingUserEventMsg = 'Existing User'

  loginForm: FormGroup;

  fiuCustomerData: any;

  hide = true;

  countDown: Subscription;
  counter = 60;
  tick = 1000;
  enableResendBtn: boolean = false;

  constructor(private snackbar: SnackbarService,
    private router: Router,
    private aesEncryptionService: AesEncryptionService,
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private tokenStorage: TokenService,
    private eventService: EventHandlingService,
    private changeDetectorRef: ChangeDetectorRef) {
  }

  eventHandler: any;
  ngOnInit(): void {
    this.getEvents();
    this.getParamsData();
    this.loginFormGroup();
  }

  getEvents() {
    this.eventHandler = this.eventService.getEvents();
  }

  loginFormGroup() {
    this.loginForm = new FormGroup({
      mobile_no: new FormControl(''),
      vua: new FormControl(),
      otp: new FormControl('', [Validators.required, Validators.maxLength(6)])
    })
  }

  timeCounter() {
    this.countDown = timer(0, this.tick)
      .pipe(take(this.counter))
      .subscribe(() => {
        --this.counter;
        if (this.counter == 0) {
          this.countDown.unsubscribe();
          this.enableResendBtn = true
        }
      });
  }

  transform(value: number): string {
    const minutes: number = Math.floor(value / 60);
    return (
      ('00' + minutes).slice(-2) +
      ':' +
      ('00' + Math.floor(value - minutes * 60)).slice(-2)
    );
  }

  fiuQueryParams: any;
  getParamsData() {
    this.route.queryParams.subscribe((params: any) => {
      if (params.ecreq && params.reqdate && params.fi) {
        this.fiuQueryParams = {
          ecreq: params.ecreq,
          reqdate: params.reqdate,
          fi: params.fi
        }
        this.fiuCustomer(this.fiuQueryParams)
      } else if (Object.keys(params).length === 1) {
        this.smsRedirectionUrl(Object.keys(params)[0])
        if (Object.keys(params)) {
          console.log(Object.keys(params)[0])
        }
      }
      else {
        console.log('Direct user')
      }
    })
  }

  smsRedirectionUrl(smsId) {
    this.authService.smsRedirectUrl(smsId)
      .subscribe((res: any) => {
        let paramString = res.exturl.split('?')[1];
        let params_arr = paramString.split('&');
        var param_Obj = {}
        for (let i = 0; i < params_arr.length; i++) {
          let pair = params_arr[i].split('=');
          param_Obj[pair[0]] = pair[1]
        }
        this.fiuQueryParams = param_Obj;
        if (this.fiuQueryParams.ecreq && this.fiuQueryParams.reqdate && this.fiuQueryParams.fi) {
          this.fiuQueryParams = {
            ecreq: this.fiuQueryParams.ecreq,
            reqdate: this.fiuQueryParams.reqdate,
            fi: this.fiuQueryParams.fi
          }
          this.fiuCustomer(this.fiuQueryParams)
        }
      })
  }

  mobileNo: any;
  encryptedMobNo: any;
  fiuCustomer(fiuQueryParams) {
    this.authService.validateFiuUser(fiuQueryParams)
      .subscribe((res: any) => {
        if (res) {
          this.fiuCustomerData = res;

          // <------ SHARING EVENTS ------>
          this.eventService.sendDataToParentEvent(this.eventHandler.NADL_LOADED);
          if (this.fiuCustomerData.registered) {
            this.eventService.sendDataToParentEvent(this.eventHandler.EXIST_USER);
          } else {
            this.eventService.sendDataToParentEvent(this.eventHandler.NEW_USER);
          }
          // <------ SHARING EVENTS ------>

          localStorage.clear();
          const consenthandles = JSON.stringify(this.fiuCustomerData.consent_handles)
          localStorage.setItem('CONSENT_HANDLE', consenthandles)

          localStorage.setItem('FIU_ENTITY_ID', this.fiuCustomerData.fiu_entity_id)

          if (this.fiuCustomerData.fipIds.length != 0) {
            const fipIds = JSON.stringify(this.fiuCustomerData.fipIds)
            localStorage.setItem('FIP_ENTITY_ID', fipIds)
          }

          this.requestOtp(res)
        }
      })
  }

  otpResponseData: any;
  encryptedVua: any;
  otpSuccessMsg: any;
  requestOtp(fiuUserData) {
    if (fiuUserData.registered) {
      var vua = this.aesEncryptionService.decryptUsingAES256(fiuUserData.vua);
      this.mobileNo = vua.split('@')[0];
    } else {
      var mobNo = this.aesEncryptionService.decryptUsingAES256(fiuUserData.mobile)
      this.mobileNo = mobNo.split('@')[0];
    }
    this.encryptedMobNo = this.aesEncryptionService.encryptUsingAES256(this.mobileNo);
    this.encryptedVua = (fiuUserData.vua) ? fiuUserData.vua : fiuUserData.mobile;

    let mobile = {
      mobile_no: this.encryptedVua,
      vua: null
    }
    this.authService.requestOtp(mobile)
      .subscribe((res: any) => {
        if (res) {
          this.otpResponseData = res;
          this.eventService.sendDataToParentEvent(this.eventHandler.OTP_INIT);
          this.snackbar.success('OTP Successfully sent to the mobile number')
          this.otpSuccessMsg = "OTP has been sent to +91 " + this.aesEncryptionService.decryptUsingAES256(res.mobile_number);
          this.timeCounter();
        }
      }, (error: HttpErrorResponse) => {
        this.eventService.sendDataToParentEvent(this.eventHandler.OTP_FAILED);
        this.snackbar.error(error.error.user_friendly_message)
      })
  }

  validateOtp() {
    if (this.fiuCustomer) {
      var registeredUser = this.fiuCustomerData.registered;
    }

    let otp = this.loginForm.get('otp').value;
    let enctryptedOTP = this.aesEncryptionService.encryptUsingAES256(otp);
    let mobileNoId = this.otpResponseData.id;

    let otpValidateObject = {
      challenge_response: enctryptedOTP,
    }
    this.authService.validateOtp(mobileNoId, otpValidateObject)
      .subscribe((res: any) => {
        if (res) {
          this.eventService.sendDataToParentEvent(this.eventHandler.OTP_VERIFY);
          if (registeredUser) {
            this.login(res.id, this.encryptedVua)
          } else {
            this.register(res.id, this.encryptedVua)
          }
        }
      },
        (error: HttpErrorResponse) => {
          this.eventService.sendDataToParentEvent(this.eventHandler.OTP_VERIFY_FAILED);
          this.snackbar.error(error.error.user_friendly_message)
        })
  }

  resend(otpResponseData) {
    this.loginForm.get('otp').reset();
    this.authService.resend(otpResponseData)
      .subscribe((res: any) => {
        if (res) {
          this.eventService.sendDataToParentEvent(this.eventHandler.OTP_RESENT);
          this.otpResponseData = res;
          this.counter = 60;
          this.tick = 1000;
          this.timeCounter();
          this.enableResendBtn = false;
          this.transform(this.counter)
          this.changeDetectorRef.detectChanges();
        } 
      },
        (error: HttpErrorResponse) => {
          this.snackbar.error(error.error.user_friendly_message)
        })
  }

  register(id?, vua?) {
    let regiserObj = {
      // full_name: "LPid5M0Sx9pont9q6eH/8A==",
      source: "WEB",
      mobile_validation_ID: id,
      mobile_no: vua,
      vua: vua
    }
    this.authService.register(regiserObj)
      .subscribe((res: any) => {
        this.setHeaders(res)
        const eventData = {
          vua: this.aesEncryptionService.decryptUsingAES256(vua),
          timeStamp: Date(),
          eventCode: "USER-SIGNUP-SUCCESS",
          message: 'New User',
        }
        this.eventService.sendDataToParentEvent(eventData)
        // this.authTokenExpiry = resp.headers.get("Token_expiry");
        this.snackbar.success("You are registered successfully");
        this.router.navigate(['consent']);
      },
        (error: HttpErrorResponse) => {
          this.snackbar.error(error.error.user_friendly_message)
          const eventData = {
            vua: this.aesEncryptionService.decryptUsingAES256(vua),
            timeStamp: Date(),
            eventCode: "USER-SIGNUP-FAILED",
            message: 'New User',
          }
          this.eventService.sendDataToParentEvent(eventData)
        })
  }


  accessToken: any;
  refreshToken: any;
  customerId: any;
  login(id?, vua?) {
    let loginData = {
      mobile_validation_ID: id,
      vua: vua,
      ecreq: this.fiuQueryParams.ecreq,
      fi: this.fiuQueryParams.fi,
      reqdate: this.fiuQueryParams.reqdate
    }
    this.authService.login(loginData)
      .subscribe((res: any) => {
        if (res) {
          const loginSuccessEvent = {
            vua: this.aesEncryptionService.decryptUsingAES256(vua),
            timeStamp: Date(),
            eventCode: this.loginSuccessEventCode,
            message: this.existingUserEventMsg
          }
          this.eventService.sendDataToParentEvent(loginSuccessEvent)

          this.tokenStorage.saveToken(res.headers.get('Access-Token'));
          this.tokenStorage.saveRefreshToken(res.headers.get('Refresh-Token'));
          this.setHeaders(res)
          this.snackbar.success("You are successfully logged in");
          this.router.navigate(['consent']);
        }
      },
        error => {
          const data = {
            vua: this.aesEncryptionService.decryptUsingAES256(vua),
            timeStamp: Date(),
            eventCode: this.loginFailureEventCode,
            message: this.existingUserEventMsg
          }
          this.eventService.sendDataToParentEvent(data);
        })
  }

  setHeaders(res) {
    sessionStorage.clear();
    // this.accessToken = res.headers.get('Access-Token');
    // this.refreshToken = res.headers.get('Refresh-Token');
    // localStorage.setItem('ACCESS_TOKEN', this.accessToken)
    // localStorage.setItem('REFRESH_TOKEN', this.refreshToken)
    sessionStorage.setItem('CUSTOMER_ID', res.body.id)
    localStorage.setItem('MOBILE_NO', res.body.mobile_no)
  }
}

