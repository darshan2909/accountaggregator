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
import { DomSanitizer } from '@angular/platform-browser';
import { EventHandlingService } from 'src/app/shared/_services/event/event-handling.service';

@Component({
  selector: 'app-consent',
  templateUrl: './consent.component.html',
  styleUrls: ['./consent.component.scss']
})
export class ConsentComponent implements OnInit {

  consentStatusEventMsg = {
    status: "Success",
    eventCode: "INVALID-CONSENT-HANDLE",
    message: "Pass consent handle",
  }

  eventHandler: any;

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
    private eventService: EventHandlingService,
    private readonly sanitizer: DomSanitizer,
    private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.getEvents();
    this.otpFormGroup()
    this.mobileNumberForm();

    this.getUserDetails();
  }

  getEvents() {
    this.eventHandler = this.eventService.getEvents()
  }

  userMobileNo: any;
  userVua: any;
  userName: any;
  getUserDetails() {
    let loggedInCustomerId = sessionStorage.getItem('CUSTOMER_ID')
    this.consentService.getUserDetails(loggedInCustomerId)
      .subscribe((res: any) => {
        if (res) {
          this.userName = res.full_name;
          this.userMobileNo = res.mobile_no;
          this.userVua = res.vua;
          this.getFipLists();
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
      mobileValidationId: new FormControl(),
      alternateMobileNo: new FormControl('', [Validators.required]),
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
      },
        (error: HttpErrorResponse) => {
          this.snackbar.error(error.error.user_friendly_message);
        })
  }

  filteredFips: any
  // FILTERING FIPs
  filterFips(fips) {
    return this.filteredFips = fips.slice();
  }

  selectFip(fip) {
    this.selectedAccounts = [];
    this.eventService.sendDataToParentEvent(this.eventHandler.SELECT_FIP);
    if (this.selectedAccounts.length === 0) {
      this.enableOtpButton = false;
    }
    this.getAccountCategories(fip)
  }

  // <----- ACCOUNT CATEGORIES -------->
  mobileNo: any;
  decryptedMobNo: any;
  mobileValidationId
  getAccountCategories(fipid) {
    this.consentService.getAccountCategory()
      .subscribe((res: any) => {
        if (res) {
          this.accountCategories = res.account_categories[0].groups[0].account_types;
          this.mobileNo = this.mobileNoFrom.get('alternateMobileNo').value;

          if (this.mobileNoFrom.get('alternateMobileNo').value === '') {
            this.mobileNo = this.userMobileNo
          } else {
            this.mobileNo = this.mobileNoFrom.get('alternateMobileNo').value
          }
          // this.mobileNo = (localStorage.getItem('changed-mobno') ? localStorage.getItem('changed-mobno') : localStorage.getItem('MOBILE_NO'))
          this.decryptedMobNo = this.aesEncryptionService.decryptUsingAES256(this.mobileNo);
          if (this.mobileNoFrom.get('mobileValidationId').value) {
            this.mobileValidationId = this.mobileNoFrom.get('mobileValidationId').value;
          }
          this.manualAccountDiscovery(this.accountCategories, fipid, this.mobileNo, this.mobileValidationId)
        }
      })
  }

  // <----- AUTO ACCOUNT DISCOVERY -------->
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

  // <----- MANUAL ACCOUNT DISCOVERY -------->
  fip_name: any;
  accountTxnId: any;
  filteredAccounts = []
  manualAccountDiscovery(accountCategories, fipid, mobileNo, mobileValidationId?) {
    let reqData = {
      account_types: accountCategories,
      fip_id: fipid,
      challenge_response: "",
      identifiers: [
        {
          "type": "MOBILE",
          "value": mobileNo
        }
      ]
    }
    if (mobileValidationId) {
      reqData["mobile_validation_ID"] = mobileValidationId;
    }

    this.consentService.discoverAccount(reqData)
      .subscribe((res: any) => {
        if (res) {
          this.filteredAccounts = res.discovered_accounts.filter((discAcnt) =>
            accountCategories.some((category) => category.id === discAcnt.type_ID)
          );
          this.accountTxnId = res.txn_id;
          this.accountDiscoverMsg = "Following accounts are discovered for the selected bank. Please select the accounts which you wish to link with your profile by using OTP."

          this.eventService.sendDataToParentEvent(this.eventHandler.DISCOVER_SUCCESS);
          this.mappingDiscoverdAccounts(this.filteredAccounts, fipid);
          if (this.enableOTPContainer) {
            this.disableOtpContainer();
          }
        }
      }, (error: HttpErrorResponse) => {
        this.snackbar.error(error.error.user_friendly_message);
        if (error.error.code === 2883) {
          this.eventService.sendDataToParentEvent(this.eventHandler.NO_DISC_ACCOUNTS);
        } else {
          this.eventService.sendDataToParentEvent(this.eventHandler.DISCOVER_FAILED);
        }
        this.accountDiscoverMsg = "Failed to discover the account for " + this.aesEncryptionService.decryptUsingAES256(mobileNo) + " mobile number."
        this.discoveredAccounts = [];
        this.disableOtpContainer();
      })
  }

  disableOtpContainer() {
    this.enableOtpButton = false;
    this.enableOTPContainer = false;
    this.otpForm.reset();
    this.enableProceedBtn = false;
  }

  mappingDiscoverdAccounts(accounts, fipId) {
    let fipLogo
    this.fipList.forEach(element => {
      if (element.id === fipId) {
        this.fip_name = element.name;
        fipLogo = element.logo_url;
      }
    });
    this.discoveredAccounts = accounts.map((data: any) => {
      return {
        linked: false,
        checked: false,
        disable: false,
        id: data.id,
        fipName: this.fip_name,
        ref_number: data.ref_number,
        accType: data.account_sub_type_ID,
        fipId: fipId,
        fiType: data.type_ID,
        maskedAccNumber: data.masked_account_number,
        fip_logo: fipLogo
      }
    })
  }

  selectedAccounts: any[] = [];
  selectAccountForLink(account) {
    account.checked = !account.checked;
    if (account.checked) {
      this.selectedAccounts.push(account)
    } else if (this.selectedAccounts.indexOf(account) !== -1) {
      this.selectedAccounts.splice(this.selectedAccounts.indexOf(account), 1);
    }
    if (this.selectedAccounts.length >= 1) {
      this.enableOtpButton = true;
    } else {
      this.enableOtpButton = false;
      this.enableOTPContainer = false;
      this.otpForm.reset();
      this.enableProceedBtn = false;
    }
    return false;
  }

  linkObject: any;
  successLinkRes: any;
  ref_number: any;
  otpSuccessMsg: any;
  checkedAccnts: boolean = false;
  async getOtp(selectedAccounts) {
    this.discoveredAccounts.forEach(data => {
      if (!data.checked) {
        data.disable = true;
      }
    });

    if (selectedAccounts.length != 0) {
      this.enableOtpButton = false;
      let accnts = []
      selectedAccounts.forEach(element => {
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
            this.snackbar.success('OTP Successfully sent to the mobile number');
            this.ref_number = res.account_link_req_ref_number;
            this.enableOTPContainer = true;
            this.enableProceedBtn = true;
            this.enableResendBtn = false;
            this.otpSuccessMsg = "OTP has been sent to +91 " + this.decryptedMobNo;
            this.counter = 30;
            this.tick = 1000;
            this.timeCounter();

            this.eventService.sendDataToParentEvent(this.eventHandler.ACCOUNT_LINK_INIT)
          }
        },
          (error: HttpErrorResponse) => {
            this.snackbar.error(error.error.user_friendly_message)
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
          // localStorage.setItem('changed-mobno', res.mobile_number)
          // localStorage.setItem('Id', res.id)
          this.mobileNoFrom.get('alternateMobileNo').patchValue(res.mobile_number)
          this.mobileNoFrom.get('mobileValidationId').patchValue(res.id)
          this.changeMobNoContainer = false;
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
        }
      },
        (error: HttpErrorResponse) => {
          this.snackbar.error(error.error.user_friendly_message);
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
          this.eventService.sendDataToParentEvent(this.eventHandler.ACCOUNT_LINK_CONFIRM)
          this.selectFip(linkObject.fip_id);
          this.disableOtpContainer();
          this.getLinkedAccounts();
        }
      },
        (error: HttpErrorResponse) => {
          this.snackbar.error(error.error);
          this.eventService.sendDataToParentEvent(this.eventHandler.ACCOUNT_LINK_FAILED)
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
    this.consentDetails = consentData.map((data: any) => {
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

  selectedAccountsCount:any;
  linkedAccntsMsg: any;
  getLinkedAccounts() {
    this.consentService.getLinkedAccounts()
      .subscribe((res: any) => {
        if (res) {
          this.linkedAccounts = res.accounts;
          this.fipList.forEach(element => {
            this.linkedAccounts.forEach(element1 => {
              if (element.id === element1.fip_Id) {
                element1["fip_name"] = element.name;
                element1["logo_url"] = element.logo_url;
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
                fip_logo: data.logo_url,
                selected: true
              }
            })
            this.linkedAccntsMsg = "Please select from already linked bank accounts for which you would like to share your bank statements."
            this.selectedAccountsForApprove = this.linkedAccounts;
            this.selectedAccountsCount = this.selectedAccountsForApprove.length;
            this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_LOAD);
          } else {
            this.linkedAccntsMsg = "Please link the account for consent approval.";
            this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_NO_ACCOUNTS);
          }
        }
      })
  }

  getSelection(acnt) {
    return this.selectedAccountsForApprove.findIndex(element => element.id === acnt.id) !== -1;
  }

  selectAccountForApprove(selectedAcnt: any) {
    const id = selectedAcnt.id;
    const index = this.selectedAccountsForApprove.findIndex(u => u.id === id);
    if (index === -1) {
      this.selectedAccountsForApprove = [...this.selectedAccountsForApprove, selectedAcnt];
    } else {
      this.selectedAccountsForApprove = this.selectedAccountsForApprove.filter(acnt => acnt.id !== selectedAcnt.id)
    }
    this.selectedAccountsCount = this.selectedAccountsForApprove.length;
    if (this.selectedAccountsForApprove.length === 0) {
      this.disableApproveBtn = true;
    } else {
      if (this.checkTermsAndCond) {
        this.disableApproveBtn = false;
      }
    }
  }

  checkTermsAndCond: boolean = false;
  disableApproveBtn: boolean = true;
  checkTerms(event: any) {
    this.checkTermsAndCond = event.checked;
    if (this.linkedAccounts.length != 0) {
      if (this.checkTermsAndCond && this.selectedAccountsForApprove.length != 0) {
        this.disableApproveBtn = false;
        this.checkTermsAndCond = true;
      } else if (this.selectedAccountsForApprove.length === 0) {
        this.disableApproveBtn = true;
      } else if (!this.checkTermsAndCond) {
        this.disableApproveBtn = true;
      }
    } else {
      if (this.checkTermsAndCond) {
        this.snackbar.info("Please link the account for consent approval..!")
      }
      this.disableApproveBtn = true;
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
            this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_APPROVED);
          }
        },
          (error: HttpErrorResponse) => {
            this.snackbar.error(error.error)
            this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_APPROVE_FAILURE);
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
          this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_APPROVED);
        }
      },
        (error: HttpErrorResponse) => {
          this.snackbar.error(error.error)
          this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_APPROVE_FAILURE);
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
              this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_REJECTED);
            }
          })
      }
    },
      (error: HttpErrorResponse) => {
        this.snackbar.error(error.error)
        this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_REJECT_FAILURE)
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
              this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_REJECTED);
            }
          })
      }
    },
      (error: HttpErrorResponse) => {
        this.snackbar.error(error.error)
        this.eventService.sendDataToParentEvent(this.eventHandler.CONSENT_REJECT_FAILURE)
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

  changeMobNoContainer: boolean = false;
  enableOtpButton1: boolean = false;
  otpField1: boolean = false;
  enableProceedBtn1: boolean = false;
  enableCancelBtn: boolean = false;
  enablePhnField() {
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
    this.mobileNoFrom.get('mobileValidationId').setValue('')
    this.mobileNoFrom.get('alternateMobileNo').setValue('')
    this.mobileNoFrom.get('alternateMobileNo').setValidators([Validators.required]);
    this.mobileNoFrom.get('otp').setValue('')
    this.mobileNoFrom.get('otp').removeValidators(Validators.required);
  }

  altMbleOtpSuccessMsg: any;
  changeMobNo() {
    let mobile = {
      mobile_no: this.aesEncryptionService.encryptUsingAES256(this.mobileNoFrom.get('alternateMobileNo').value),
      vua: null
    }
    this.authService.requestOtp(mobile)
      .subscribe((res: any) => {
        if (res) {
          this.changedMobNo = this.mobileNoFrom.get('alternateMobileNo').value;
          this.otpResponseData = res;
          this.otpField1 = true;
          this.isPhnFieldEnabled = false;
          this.enableOtpButton1 = false;
          this.enableProceedBtn1 = true;

          this.mobileNoFrom.get('otp').setValidators([Validators.required]);
          this.mobileNoFrom.get('alternateMobileNo').setValidators([Validators.required]);
          this.altMbleOtpSuccessMsg = "OTP has been sent to +91 " + this.changedMobNo;
          this.snackbar.success('OTP successfully sent to the mobile number');
          this.timeCounter();
        }
      }, error => {
        this.altMbleOtpSuccessMsg = 'Failed to send otp.'
      })
  }
}
