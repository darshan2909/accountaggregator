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

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {


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
    private tokenStorage: TokenService) {
  }

  ngOnInit(): void {
    console.log(this.aesEncryptionService.decryptUsingAES256('01GZQSF386W99BGDXW5FJNK8YB'))
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
  requestOtp(fiuUserData) {
    if (fiuUserData.registered) {
      var vua = this.aesEncryptionService.decryptUsingAES256(fiuUserData.vua);
      this.mobileNo = vua.split('@')[0];
    } else {
      var mobNo = this.aesEncryptionService.decryptUsingAES256(fiuUserData.mobile)
      this.mobileNo = mobNo.split('@')[0];
    }
    this.encryptedMobNo = this.aesEncryptionService.encryptUsingAES256(this.mobileNo);

    let mobile = {
      mobile_no: this.encryptedMobNo,
      vua: null
    }
    this.authService.requestOtp(mobile)
      .subscribe((res: any) => {
        if (res) {
          console.log('Request OTP Response', res)
          this.otpResponseData = res;
          this.snackbar.success('OTP Successfully sent to the mobile number')
          this.timeCounter();
        }
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
          if (registeredUser) {
            this.login(res.id, this.encryptedMobNo)
          } else {
            console.log('register')
            // this.register()
          }
        }
      })
  }

  resend(otpResponseData) {
    this.authService.resend(otpResponseData)
      .subscribe((res: any) => {
        if (res) {
          console.log('Resend OTP Response', res)
          this.otpResponseData = res;
          this.timeCounter();
        } else {
          console.log('failure')
        }
      })
  }

  register() {
    console.log('Inside register method')
    let regiserObj = {
      full_name: "LPid5M0Sx9pont9q6eH/8A==",
      source: "WEB",
      mobile_validation_ID: "01H57531B5RTWMGTQQKXJHEHB8",
      mobile_no: "FKuV/0wV+mcaMN3elO4FCA==",
      vua: "FKuV/0wV+mcaMN3elO4FCA=="
    }

    // this.authService.register(regiserObj)
    //   .subscribe((res: any) => {
    //     console.log('Register Response', res)
    //   })
  }


  accessToken: any;
  refreshToken: any;
  customerId: any;
  login(id?, mobileNo?) {
    let loginData = {
      mobile_validation_ID: id,
      vua: mobileNo,
      ecreq: this.fiuQueryParams.ecreq,
      fi: this.fiuQueryParams.fi,
      reqdate: this.fiuQueryParams.reqdate
    }
    this.authService.login(loginData)
      .subscribe((res: any) => {
        if (res) {
          console.log('Login Response', res)
          // this.tokenStorage.saveToken(res.headers.get('Access-Token'));
          // this.tokenStorage.saveRefreshToken(res.headers.get('Refresh-Token'));

          this.accessToken = res.headers.get('Access-Token');
          this.refreshToken = res.headers.get('Refresh-Token');

          sessionStorage.setItem('CUSTOMER_ID', res.body.id)

          localStorage.setItem('ACCESS_TOKEN', this.accessToken)
          localStorage.setItem('REFRESH_TOKEN', this.refreshToken)

          localStorage.setItem('MOBILE_NO', res.body.mobile_no)

          // this.authTokenExpiry = resp.headers.get("Token_expiry");
          this.snackbar.success("You are successfully logged in");
          this.router.navigate(['consent']);
        }
      })
  }

}
