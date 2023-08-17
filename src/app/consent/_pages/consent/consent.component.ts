import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/authentication/_services/auth/authentication.service';
import { AesEncryptionService } from 'src/app/shared/_services/aes-encryption.service';
import { DialogMessageService } from 'src/app/shared/_services/dialog/dialog-message.service';
import { SnackbarService } from 'src/app/shared/_services/snackbar/snackbar.service';
import { ConsentService } from '../../_services/consent.service';
import { ChangeDetectorRef } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-consent',
  templateUrl: './consent.component.html',
  styleUrls: ['./consent.component.scss']
})
export class ConsentComponent implements OnInit {

  approveSuccessEventMsg = {
    status: "Success",
    eventCode: "CONSENT-APPROVED-SUCCESS",
    message: "Consent Approved Successfully",
  }

  approveFailureEventMsg = {
    status: "Error",
    eventCode: "CONSENT-APPROVED-FAILED",
    message: "Unable to approve consent",
  }

  rejectSuccessEventMsg = {
    status: "Success",
    eventCode: "CONSENT-REJECTED-SUCCESS",
    message: "Consent Rejected Successfully",
  }

  rejectFailureEventMsg = {
    status: "Error",
    eventCode: 'CONSENT-REJECTED-FAILED',
    message: "Unable to reject consent",
  }

  consentStatusEventMsg = {
    status: "Success",
    eventCode: "INVALID-CONSENT-HANDLE",
    message: "Pass consent handle",
  }

  linkedAccounts: any[] = [];
  selectedAccountsForApprove: any = [];
  fipList: any[] = [];
  enableOTPContainer: boolean = false;
  enableOtpButton: boolean = false;
  enableProceedBtn: boolean = false;

  accountCategories: any;
  accountDiscoverMsg: any;
  fipid;
  discoveredAccounts: any[] = [];
  consentDetails: any[] = [];
  isPhnFieldEnabled: boolean;
  showOtpField: boolean;
  countDown: Subscription;
  counter = 30;
  tick = 1000;
  enableResendBtn: boolean = false;
  hide = true;
  otpResponseData: any;
  changedMobNo: any;

  constructor(private router: Router,
    private authService: AuthenticationService,
    private consentService: ConsentService,
    private snackbar: SnackbarService,
    private dialog: DialogMessageService,
    private aesEncryptionService: AesEncryptionService,
    private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.otpFormGroup()
    this.mobileNumberForm();
    let loggedInCustomerId = sessionStorage.getItem('CUSTOMER_ID')
    // this.getUserDetails(loggedInCustomerId)
    // this.getFiuLists();
    this.getFipLists();
    // this.getConsentHandles();
  }

  getUserDetails(customerId) {
    this.authService.getUserDetails(customerId)
      .subscribe((res: any) => {
        if (res) {
          console.log(res)
        }
      })
  }

  otpForm: FormGroup;
  mobileNoFrom: FormGroup;
  otpFormGroup() {
    this.otpForm = new FormGroup({
      mobileNo: new FormControl(''),
      otp: new FormControl('', [Validators.required, Validators.maxLength(6)])
    })
  }

  mobileNumberForm() {
    this.mobileNoFrom = new FormGroup({
      mobileNo: new FormControl('', [Validators.required]),
      otp: new FormControl('')
    })
  }

  getFiuLists() {
    this.consentService.getFiuLists()
      .subscribe((res: any) => {
        if (res) {
          // console.log('FIU lists', res)
        }
      })
  }

  //FETCHING FIP DETAILS
  getFipLists() {
    this.consentService.getFipLists()
      .subscribe((res: any) => {
        if (res) {
          console.log('FIP Lists', res)
          this.fipList = res.FIPs;
          this.getConsentHandles();
          this.filterFips(this.fipList)
          if (localStorage.getItem('FIP_ENTITY_ID')) {
            this.fipid = JSON.parse(localStorage.getItem('FIP_ENTITY_ID'));
            this.getAccountCategories(this.fipid[0]);
          } else {
            this.accountDiscoverMsg = "Please select bank for account discovery."
          }
        }
      })
  }

  filteredFips: any
  // FILTERING FIPs
  filterFips(fips) {
    return this.filteredFips = fips.slice();
  }

  selectFip(fip) {
    this.selectedAccounts = [];
    if (this.selectedAccounts.length === 0) {
      this.enableOtpButton = false;
    }
    this.getAccountCategories(fip)
  }

  mobileNo: any;
  decryptedMobNo: any;
  getAccountCategories(fipid) {
    this.consentService.getAccountCategory()
      .subscribe((res: any) => {
        if (res) {
          this.accountCategories = res.account_categories[0].groups[0].account_types;
          this.mobileNo = (localStorage.getItem('changed-mobno') ? localStorage.getItem('changed-mobno') : localStorage.getItem('MOBILE_NO'))
          this.decryptedMobNo = this.aesEncryptionService.decryptUsingAES256(this.mobileNo);
          let mobileValidationId = localStorage.getItem('Id');
          this.manualAccountDiscovery(this.accountCategories, fipid, this.mobileNo, mobileValidationId)
        }
      })
  }

  accountTxnId: any;
  // autoAccountDiscovery(accountCategories, mobileNo) {
  //   let data = {
  //     account_types: accountCategories,
  //     identifiers: [
  //       {
  //         "type": "MOBILE",
  //         "value": mobileNo
  //       }
  //     ]
  //   }
  //   this.consentService.autoAccountDiscovery(data)
  //     .subscribe((res: any) => {
  //       this.discoveredAccounts = res.discovered_accounts;
  //       console.log('DISCOVERED ACCOUNTS AUTO', this.discoveredAccounts)
  //       this.accountTxnId = res.txn_id;
  //       this.mappingDiscoverdAccounts(this.discoveredAccounts);
  //     })
  // }

  fip_name: any;
  filteredAccounts = []
  manualAccountDiscovery(accountCategories, fipid, mobileNo, Id?) {
    this.fipList.forEach(element => {
      if (element.id === fipid) {
        this.fip_name = element.name;
      }
    });
    let data = {
      account_types: accountCategories,
      fip_id: fipid,
      identifiers: [
        {
          "type": "MOBILE",
          "value": mobileNo
        }
      ]
    }
    if (Id) {
      data["mobile_validation_ID"] = Id;
    }

    this.consentService.discoverAccount(data)
      .subscribe((res: any) => {
        if (res) {
          this.filteredAccounts = res.discovered_accounts.filter((discAcnt) =>
            accountCategories.some((category) => category.id === discAcnt.type_ID)
          );

          this.accountTxnId = res.txn_id;
          this.accountDiscoverMsg = "Following accounts are discovered for the selected bank. Please select the accounts which you wish to link with your profile by using OTP."
          this.mappingDiscoverdAccounts(this.filteredAccounts, this.fip_name, fipid);
        }
      }, (error: HttpErrorResponse) => {
        this.accountDiscoverMsg = "Failed to discover the account for " + this.aesEncryptionService.decryptUsingAES256(mobileNo) + " mobile number."
        this.discoveredAccounts = [];
      })
  }

  mappingDiscoverdAccounts(accounts, fipName, fipId) {
    this.discoveredAccounts = accounts.map((data: any) => {
      return {
        linked: false,
        checked: false,
        id: data.id,
        fipName: fipName,
        // accountRefId: "7b905b8f-032a-40ec-8101-94762e774c46",
        // linkRefNumber: "N/A",
        ref_number: data.ref_number,
        accType: data.account_sub_type_ID,
        fipId: fipId,
        fiType: data.type_ID,
        maskedAccNumber: data.masked_account_number
      }
    })
  }

  selectedAccounts: any[] = [];
  selectAccount(event, account) {
    if (event.checked == true) {
      this.enableOtpButton = true;
      this.selectedAccounts.push(account);
    } else if (this.selectedAccounts.indexOf(account) !== -1) {
      this.selectedAccounts.splice(this.selectedAccounts.indexOf(account), 1);
    }

    if (this.selectedAccounts.length === 0) {
      this.enableOtpButton = false;
      this.enableOTPContainer = false;
      this.otpForm.reset();
      this.enableProceedBtn = false;
      this.discoveredAccounts.forEach((element: any) => {
        element.checked = false
      })
      // console.log(this.discoveredAccounts)
      return this.discoveredAccounts;
    }
  }

  linkObject: any;
  successLinkRes: any;
  ref_number: any;
  otpSuccessMsg: any;
  async getOtp(selectedAccounts) {
    if (selectedAccounts.length != 0) {
      this.enableOtpButton = false;

      let accnts = []
      selectedAccounts.forEach(element => {
        element.checked = false;
        accnts.push(element.id)
      });
      this.linkObject = {
        fip_id: selectedAccounts[0].fipId,
        accounts: accnts
      }
      this.consentService.accountLink(this.linkObject)
        .subscribe((res: any) => {
          if (res) {
            this.successLinkRes = res;
            this.ref_number = res.account_link_req_ref_number;
            this.enableOTPContainer = true;
            this.enableProceedBtn = true;
            this.otpSuccessMsg = "OTP has been sent to +91 " + this.decryptedMobNo
            this.timeCounter();
          }
        })
    } else {
      this.snackbar.warn('Please select account for linking')
    }
  }

  validateOtp(formValue) {
    let otp = formValue.get('otp').value;
    let enctryptedOTP = this.aesEncryptionService.encryptUsingAES256(otp);
    let mobileNoId = this.otpResponseData.id;

    let otpValidateObject = {
      challenge_response: enctryptedOTP,
    }
    this.authService.validateOtp(mobileNoId, otpValidateObject)
      .subscribe((res: any) => {
        if (res) {
          // localStorage.setItem('changed-mobno', this.aesEncryptionService.encryptUsingAES256(this.changedMobNo));
          localStorage.setItem('changed-mobno', res.mobile_number)
          localStorage.setItem('Id', res.id)
        }
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

  resendOtp(otpResponseData) {
    this.authService.resend(otpResponseData)
      .subscribe((res: any) => {
        if (res) {
          this.otpResponseData = res;
          this.counter = 30;
          this.tick = 1000;
          this.timeCounter();
          this.enableResendBtn = false;
          this.transform(30)
          this.changeDetectorRef.detectChanges();
        } else {
          console.log('failure')
        }
      })
  }

  async resendAccDiscOtp(selectedAccounts) {
    this.otpForm.get('otp').reset();
    await this.getOtp(selectedAccounts)
    this.counter = 30;
    this.tick = 1000;
    this.enableResendBtn = false;
    this.transform(this.counter)
    this.changeDetectorRef.detectChanges();
  }

  confirmLinkAccount(linkObject) {
    let encrytedOtp = this.aesEncryptionService.encryptUsingAES256(this.otpForm.get('otp').value)
    let confirmLinkObj = {
      token: encrytedOtp,
      fip_id: linkObject.fip_id,
      account_link_req_ref_number: this.ref_number
    }
    this.consentService.confirmAccountLink(confirmLinkObj)
      .subscribe((res: any) => {
        if (res) {
          this.snackbar.success('Selected account linked successfully.');
          this.selectFip(linkObject.fip_id);
          if (this.selectedAccounts.length === 0) {
            ;
            this.otpForm.get('otp').reset();
            this.enableOTPContainer = false
          }
          this.getLinkedAccounts();
        } else {
          console.log('Failure')
        }
      })
  }

  // CONSENT DETAILS STARTS
  consentHandles: any;
  getConsentHandles() {
    this.consentHandles = JSON.parse(localStorage.getItem("CONSENT_HANDLE"));
    if (this.consentHandles.length === 1) {
      this.getConsentDetails();
    } else {
      this.getMultipleConsentDetails(this.consentHandles);
    }
  }

  getConsentDetails() {
    let consentParams = {
      status: 'PENDING'
    }
    this.consentService.getConsentDetails(consentParams)
      .subscribe((res: any) => {
        if (res) {
          // console.log('Consent details', res.consents)
          this.mapConsentDetails(res.consents);
        }
      })
  }

  getMultipleConsentDetails(consentHandles) {
    this.consentService.getMultipleConsentDetails(consentHandles)
      .subscribe((res: any) => {
        if (res) {
          // console.log('Multiple Consent details', res.consents)
          this.mapConsentDetails(res.consents);
        }
      })
  }

  mapConsentDetails(consentData) {
    this.consentDetails = consentData;
    this.consentDetails = this.consentDetails.map((data: any) => {
      return {
        consentHandle: data.Consent_handle,
        transactionId: data.txnid,
        purpose: data.ConsentDetail.Purpose.text,
        recurrance: data.ConsentDetail.fetchType,
        dateRange: data.ConsentDetail.FIDataRange,
        dataRequest: data.ConsentDetail.consentTypes,
        consentStartDate: data.ConsentDetail.consentStart,
        consentEndDate: data.ConsentDetail.consentExpiry,
        dataLife: data.ConsentDetail.DataLife
      }
    })
    this.getLinkedAccounts();
  }
  // CONSENT DETAILS ENDS

  linkedAccntsMsg: any;
  getLinkedAccounts() {
    this.consentService.getLinkedAccounts()
      .subscribe((res: any) => {
        if (res) {
          this.linkedAccounts = res.accounts;
          // console.log('Linked Accounts', this.linkedAccounts)
          this.fipList.forEach(element => {
            this.linkedAccounts.forEach(element1 => {
              if (element.id === element1.fip_Id) {
                element1["fip_name"] = element.name;
              }
            });
          });

          if (this.linkedAccounts.length != 0) {
            this.linkedAccounts = this.linkedAccounts.map((data: any) => {
              return {
                id: data.id,
                fipName: data.fip_name,
                accountRefId: '',
                linkRefNumber: data.ref_number,
                accType: data.type.account_sub_type.id,
                fipId: data.fip_Id,
                fiType: data.type.id,
                maskedAccNumber: data.masked_account_number,
                logo: data.type.logo_url,
                selected: true
              }
            })
            this.selectedAccountsForApprove = this.linkedAccounts;
          } else {
            this.linkedAccntsMsg = "Please link the account for consent approval."
          }
        }
      })
  }

  getSelection(acnt) {
    return this.selectedAccountsForApprove.findIndex(element => element.id === acnt.id) !== -1;
  }

  selectAccountForApprove(selectedAcnt: any, event: KeyboardEvent) {
    const id = selectedAcnt.id;
    const index = this.selectedAccountsForApprove.findIndex(u => u.id === id);
    if (index === -1) {
      this.selectedAccountsForApprove = [...this.selectedAccountsForApprove, selectedAcnt];
    } else {
      this.selectedAccountsForApprove = this.selectedAccountsForApprove.filter(acnt => acnt.id !== selectedAcnt.id)
    }
    console.log(this.selectedAccountsForApprove)
    console.log(this.checkTermsAndCond)
    console.log(this.disableApproveBtn)
    if (this.selectedAccountsForApprove.length === 0) {
      if (this.checkTermsAndCond === false) {
        this.disableApproveBtn = true;
      } else {
        this.disableApproveBtn = false;
      }
      // this.checkTermsAndCond = false;
    }
    // else {
    // }
  }

  checkTermsAndCond: boolean = false;
  disableApproveBtn: boolean = true;
  checkTerms(event: any) {
    if (event.checked && this.linkedAccounts.length != 0 && this.selectedAccountsForApprove.length != 0) {
      this.disableApproveBtn = false;
      this.checkTermsAndCond = true;
    } else {
      this.disableApproveBtn = true;
      this.checkTermsAndCond = false;
    }
  }

  approveConsent(consentDetails, accounts) {
    if (accounts.length === 0) {
      this.snackbar.info('Please select atlease one account')
    } else if (consentDetails.length > 1) {
      this.consentHandles = JSON.parse(localStorage.getItem("CONSENT_HANDLE"));
      this.approveMultipleConsent(this.consentHandles, accounts)
    } else {
      const accntIds = []
      accounts.forEach(element => {
        accntIds.push(element.id)
      });
      let accountsobj = {
        account_IDs: accntIds,
        challenge_response: null,
        resend_otp: false
      }
      this.consentService.approveConsent(consentDetails[0].consentHandle, accountsobj)
        .subscribe((resdata: any) => {
          if (resdata) {
            this.approveRedirection(resdata);
            this.sendDataToParent(this.approveSuccessEventMsg);
          }
        },
          error => {
            this.sendDataToParent(this.approveFailureEventMsg);
          })
    }
  }

  approveMultipleConsent(consentHandles, accounts) {
    const accntIds = []
    accounts.forEach(element => {
      accntIds.push(element.id)
    });
    let consentData = {
      consentHandles: consentHandles,
      account_IDs: accntIds,
      resend_otp: false
    }
    this.consentService.approveMultipleConsent(consentData)
      .subscribe((resdata: any) => {
        if (resdata) {
          this.approveRedirection(resdata);
          this.sendDataToParent(this.approveSuccessEventMsg);
        }
      },
        error => {
          this.sendDataToParent(this.approveFailureEventMsg);
        })
  }

  approveRedirection(resdata) {
    if (resdata) {
      if (resdata.NonFiuCustomerReq.ecres != null) {
        const url = `${resdata.NonFiuCustomerReq.redirect}?ecres=${resdata.NonFiuCustomerReq.ecres}&resdate=${resdata.NonFiuCustomerReq.resdate}&fi=${resdata.NonFiuCustomerReq.fi}`;
        window.location.href = encodeURI(url);
      } else {
        console.log('Direct customer reject response')
      }
    }
  }

  rejectReasons: any;
  getRejectReasons(consentData) {
    this.consentService.rejectReason()
      .subscribe((res: any) => {
        if (res) {
          this.rejectReasons = res.reject_reasons[3];
          if (consentData.length > 1) {
            this.consentHandles = JSON.parse(localStorage.getItem("CONSENT_HANDLE"));
            this.rejectMultipleConsent(this.rejectReasons, this.consentHandles)
          } else {
            this.rejectConsent(this.rejectReasons, consentData)
          }
        }
      })
  }

  rejectConsent(rejectReasons, consentData) {
    let rejectObj = {
      id: rejectReasons.id,
      resend_otp: false
    }
    this.dialog.confirmDialog({
      message: 'Are you sure you want to reject the consent.',
      confirm: "YES",
      cancel: "No"
    }).subscribe(yes => {
      if (yes) {
        this.consentService.rejectConsent(rejectObj, consentData[0].consentHandle)
          .subscribe((resdata: any) => {
            if (resdata) {
              this.rejectResponse(resdata);
              this.sendDataToParent(this.rejectSuccessEventMsg)
            }
          })
      }
    },
      error => {
        this.sendDataToParent(this.rejectFailureEventMsg)
      })
  }

  rejectMultipleConsent(rejectReasons, consentHandles) {
    let rejectObj = {
      consentHandles: consentHandles,
      id: rejectReasons.id,
      resend_otp: false
    }
    this.dialog.confirmDialog({
      message: 'Are you sure you want to reject the consent.',
      confirm: "YES",
      cancel: "No"
    }).subscribe(yes => {
      if (yes) {
        this.consentService.rejectMultipleConsent(rejectObj)
          .subscribe((resdata: any) => {
            if (resdata) {
              this.rejectResponse(resdata);
              this.sendDataToParent(this.rejectSuccessEventMsg);
            }
          })
      }
    },
      error => {
        this.sendDataToParent(this.rejectFailureEventMsg)
      })
  }

  rejectResponse(resdata) {
    if (resdata) {
      if (resdata.NonFiuCustomerReq.ecres != null) {
        const url = `${resdata.NonFiuCustomerReq.redirect}?ecres=${resdata.NonFiuCustomerReq.ecres}&resdate=${resdata.NonFiuCustomerReq.resdate}&fi=${resdata.NonFiuCustomerReq.fi}`;
        window.location.href = encodeURI(url);
      } else {
        console.log('Direct customer reject response')
      }
    }
  }

  getAccessToken() {
    this.authService.generateAuthToken()
  }

  changeMobNoContainer: boolean = false;
  enableOtpButton1: boolean = false;
  otpField1: boolean = false;
  enableProceedBtn1: boolean = false;
  enableCancelBtn: boolean = false;
  enablePhnField() {
    console.log(this.mobileNoFrom)
    this.isPhnFieldEnabled = true;
    this.enableOtpButton1 = true;
    this.enableCancelBtn = true;
    this.otpField1 = false;
    this.changeMobNoContainer = true;
  }

  disablePhnField() {
    // this.isPhnFieldEnabled = false;
    // this.enableOtpButton1 = false;
    this.changeMobNoContainer = false;
    this.enableProceedBtn1 = false;
    // this.mobileNoFrom.reset();
    this.mobileNoFrom.get('mobileNo').setValue('')
    this.mobileNoFrom.get('mobileNo').setValidators([Validators.required]);
    this.mobileNoFrom.get('otp').setValue('')
    this.mobileNoFrom.get('otp').removeValidators(Validators.required);
  }

  altMbleOtpSuccessMsg: any;
  changeMobNo() {
    let mobile = {
      mobile_no: this.aesEncryptionService.encryptUsingAES256(this.mobileNoFrom.get('mobileNo').value),
      vua: null
    }
    this.authService.requestOtp(mobile)
      .subscribe((res: any) => {
        if (res) {
          this.changedMobNo = this.mobileNoFrom.get('mobileNo').value;
          this.otpResponseData = res;
          console.log('Request OTP Response', res);
          this.otpField1 = true;
          this.isPhnFieldEnabled = false;
          this.enableOtpButton1 = false;
          this.enableProceedBtn1 = true;

          this.mobileNoFrom.get('otp').setValidators([Validators.required]);
          this.mobileNoFrom.get('mobileNo').setValidators([Validators.required]);
          this.altMbleOtpSuccessMsg = "OTP has been sent to +91 " + this.changedMobNo;
          this.snackbar.success('OTP successfully sent to the mobile number');
          this.timeCounter();
        }
      }, error => {
        this.altMbleOtpSuccessMsg = 'Failed to send otp.'
      })
  }

  sendDataToParent(msg: any) {
    const data = { message: msg };
    window.parent.postMessage(data, '*');
  }
}
