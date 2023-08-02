import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/authentication/_services/auth/authentication.service';
import { AesEncryptionService } from 'src/app/shared/_services/aes-encryption.service';
import { DialogMessageService } from 'src/app/shared/_services/dialog/dialog-message.service';
import { SnackbarService } from 'src/app/shared/_services/snackbar/snackbar.service';
import { ConsentService } from '../../_services/consent.service';

@Component({
  selector: 'app-consent',
  templateUrl: './consent.component.html',
  styleUrls: ['./consent.component.scss']
})
export class ConsentComponent implements OnInit {

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

  constructor(private router: Router,
    private authService: AuthenticationService,
    private consentService: ConsentService,
    private snackbar: SnackbarService,
    private dialog: DialogMessageService,
    private aesEncryptionService: AesEncryptionService) { }

  ngOnInit(): void {
    this.otpFormGroup()
    let loggedInCustomerId = sessionStorage.getItem('CUSTOMER_ID')
    // this.getUserDetails(loggedInCustomerId)
    // this.getFiuLists();
    this.getFipLists();
    this.getConsentHandles();
    this.getLinkedAccounts();
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
  otpFormGroup() {
    this.otpForm = new FormGroup({
      mobileNo: new FormControl(''),
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

  getFipLists() {
    this.consentService.getFipLists()
      .subscribe((res: any) => {
        if (res) {
          console.log('FIP Lists', res)
          this.fipList = res.FIPs;
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
    if(this.selectedAccounts.length === 0){
      this.enableOtpButton = false;
    }
    this.getAccountCategories(fip)
  }

  mobileNo: any;
  decryptedMobNo:any;
  getAccountCategories(fipid) {
    this.consentService.getAccountCategory()
      .subscribe((res: any) => {
        if (res) {
          this.accountCategories = res.account_categories[0].groups[0].account_types;
          this.mobileNo = localStorage.getItem('MOBILE_NO')
          this.decryptedMobNo = this.aesEncryptionService.decryptUsingAES256(this.mobileNo);
          this.manualAccountDiscovery(this.accountCategories, fipid, this.mobileNo)
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
  manualAccountDiscovery(accountCategories, fipid, mobileNo) {
    console.log(fipid)
    this.fipList.forEach(element => {
      if (element.id === fipid) {
        this.fip_name = element.name;
      }
    });
    console.log(this.fipList)
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
    this.consentService.discoverAccount(data)
      .subscribe((res: any) => {
        if (res) {
          console.log(res)
          this.discoveredAccounts = res.discovered_accounts;
          console.log('DISCOVERED ACCOUNTS MANUAL', this.discoveredAccounts)
          this.accountTxnId = res.txn_id;
          this.mappingDiscoverdAccounts(this.discoveredAccounts, this.fip_name, fipid);
        }
      })
  }

  mappingDiscoverdAccounts(accounts, fipName, fipId) {
    this.discoveredAccounts = accounts.map((data: any) => {
      return {
        linked: false,
        selected: false,
        id: data.id,
        fipName: fipName,
        // accountRefId: "7b905b8f-032a-40ec-8101-94762e774c46",
        // linkRefNumber: "N/A",
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
      this.selectedAccounts.push(account);
      this.enableOtpButton = true;
    } else if (this.selectedAccounts.indexOf(account) !== -1) {
      this.selectedAccounts.splice(this.selectedAccounts.indexOf(account), 1);
    }

    if (this.selectedAccounts.length === 0) {
      this.enableOtpButton = false;
    }
  }

  linkObject: any;
  successLinkRes: any;
  ref_number: any;
  getOtp(selectedAccounts) {
    if (selectedAccounts.length != 0) {
      this.enableOTPContainer = true;
      this.enableOtpButton = false;
      this.enableProceedBtn = true;

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
            this.ref_number = res.account_link_req_ref_number;
          }
        })
    } else {
      this.snackbar.warn('Please select account for linking')
    }
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
          console.log(res)
        }
      })
  }

  linkedAccntsMsg: any;
  getLinkedAccounts() {
    this.consentService.getLinkedAccounts()
      .subscribe((res: any) => {
        if (res) {
          this.linkedAccounts = res.accounts
          console.log('Linked Accounts', this.linkedAccounts)
          if (this.linkedAccounts.length != 0) {
            this.linkedAccounts = this.linkedAccounts.map((data: any) => {
              return {
                id: data.id,
                fipName: data.fip_Id,
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
      size: 10,
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
    console.log(this.consentDetails)
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
  }
  // CONSENT DETAILS ENDS

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
  }

  checkTermsAndCond: boolean = false;
  disableApproveBtn: boolean = true;
  checkTerms(event: any) {
    if (event.checked && this.linkedAccounts.length != 0) {
      this.disableApproveBtn = false;
      this.checkTermsAndCond = true;
    }
  }

  approveConsent(consentDetails, accounts) {
    console.log(consentDetails)
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
            console.log(resdata)
            this.approveRedirection(resdata);
          }
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
          console.log(resdata)
          this.approveRedirection(resdata);
        }
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
    console.log(consentData)
    this.consentService.rejectReason()
      .subscribe((res: any) => {
        if (res) {
          this.rejectReasons = res.reject_reasons[3];
          console.log(this.rejectReasons)
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
            }
          })
      }
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
              this.rejectResponse(resdata)
            }
          })
      }
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
}
