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
  counter = 30;
  tick = 1000;
  enableResendBtn: boolean = false;

  constructor(private snackbar: SnackbarService,
    private router: Router,
    private aesEncryptionService: AesEncryptionService,
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private tokenStorage: TokenService,
    private changeDetectorRef: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    localStorage.removeItem('changed-mobno');
    this.getParamsData();
    this.loginFormGroup();
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
        // console.log(this.counter);
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
        console.log('FIU customer with redirection url')
        this.fiuQueryParams = {
          ecreq: params.ecreq,
          reqdate: params.reqdate,
          fi: params.fi
        }
        this.fiuCustomer(this.fiuQueryParams)
      } else if (Object.keys(params).length === 1) {
        console.log('FIU customer with sms url')
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
        console.log(res)
      })
  }

  mobileNo: any;
  encryptedMobNo: any;
  fiuCustomer(fiuQueryParams) {
    this.authService.validateFiuUser(fiuQueryParams)
      .subscribe((res: any) => {
        if (res) {
          console.log('FIU Customer Response', res)
          this.fiuCustomerData = res;
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
        // if (res.registered) {
        //   console.log('Login method')
        //   let vua = this.aesEncryptionService.decryptUsingAES256(res.vua)
        //   console.log(this.aesEncryptionService.decryptUsingAES256('LPid5M0Sx9pont9q6eH/8A=='))
        //   this.mobileNo = vua.split('@')[0];
        //   this.requestOtp(this.mobileNo)
        // } else {
        //   console.log('Register method')
        // }
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
          console.log('Request OTP Response', res)
          this.otpResponseData = res;
          this.snackbar.success('OTP Successfully sent to the mobile number')
          this.otpSuccessMsg = "OTP has been sent to +91 " + this.aesEncryptionService.decryptUsingAES256(res.mobile_number);
          this.timeCounter();
        }
      }, error => {
        this.snackbar.error(error)
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
          console.log('OTP Success Response', res)
          console.log(this.encryptedVua)
          if (registeredUser) {
            this.login(res.id, this.encryptedVua)
          } else {
            console.log('register')
            this.register(res.id, this.encryptedVua)
          }
        }
      })
  }

  resend(otpResponseData) {
    this.loginForm.get('otp').reset();
    this.authService.resend(otpResponseData)
      .subscribe((res: any) => {
        if (res) {
          console.log('Resend OTP Response', res)
          this.otpResponseData = res;
          this.counter = 30;
          this.tick = 1000;
          this.timeCounter();
          this.enableResendBtn = false;
          this.transform(this.counter)
          this.changeDetectorRef.detectChanges();
        } else {
          console.log('failure')
        }
      })
  }

  register(id?, vua?) {
    console.log(vua)
    let regiserObj = {
      // full_name: "LPid5M0Sx9pont9q6eH/8A==",
      source: "WEB",
      mobile_validation_ID: id,
      mobile_no: vua,
      vua: vua
    }
    this.authService.register(regiserObj)
      .subscribe((res: any) => {
        console.log('Register Response', res)
        this.setHeaders(res)
        const data = {
          vua: this.aesEncryptionService.decryptUsingAES256(vua),
          timeStamp: Date(),
          eventCode: "USER-SIGNUP-SUCCESS",
          message: 'New User',
        }
        this.sendDataToParent(data)
        // this.authTokenExpiry = resp.headers.get("Token_expiry");
        this.snackbar.success("You are registered successfully");
        this.router.navigate(['consent']);
      }, error => {
        this.snackbar.error(error)
        const data = {
          vua: this.aesEncryptionService.decryptUsingAES256(vua),
          timeStamp: Date(),
          eventCode: "USER-SIGNUP-FAILED",
          message: 'New User',
        }
        this.sendDataToParent(data)
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
          console.log('Login Response', res)
          const loginSuccessEvent = {
            vua: this.aesEncryptionService.decryptUsingAES256(vua),
            timeStamp: Date(),
            eventCode: this.loginSuccessEventCode,
            message: this.existingUserEventMsg
          }
          this.sendDataToParent(loginSuccessEvent)
          // this.tokenStorage.saveToken(res.headers.get('Access-Token'));
          // this.tokenStorage.saveRefreshToken(res.headers.get('Refresh-Token'));
          this.setHeaders(res)
          // this.authTokenExpiry = resp.headers.get("Token_expiry");
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
          this.sendDataToParent(data);
        })
  }

  setHeaders(res) {
    this.accessToken = res.headers.get('Access-Token');
    this.refreshToken = res.headers.get('Refresh-Token');
    sessionStorage.setItem('CUSTOMER_ID', res.body.id)
    localStorage.setItem('ACCESS_TOKEN', this.accessToken)
    localStorage.setItem('REFRESH_TOKEN', this.refreshToken)
    localStorage.setItem('MOBILE_NO', res.body.mobile_no)
  }

  sendDataToParent(event: any) {
    const eventObject = { message: event };
    console.log(eventObject)
    window.parent.postMessage(eventObject, '*');
  }
}

