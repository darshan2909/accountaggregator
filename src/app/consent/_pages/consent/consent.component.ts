import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/authentication/_services/authentication.service';
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
  enableOtpButton: boolean = true;
  enableProceedBtn: boolean = false;

  // accounts = [
  //   {
  //     "linked": false,
  //     "fipName": "FinShareBankServer",
  //     "accountRefId": "7b905b8f-032a-40ec-8101-94762e774c46",
  //     "linkRefNumber": "N/A",
  //     "accType": "SAVINGS",
  //     "fipId": "finsharebank",
  //     "fiType": "DEPOSIT",
  //     "maskedAccNumber": "XXXXXXXX3700"
  //   }
  // ]

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
    this.getLinkedAccounts();
    this.getFiuLists();
    this.getFipLists();
    this.getConsentHandles();
    this.getAccountCategories();
    // this.discoverAccount();
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

  accountCategories: any;
  getAccountCategories() {
    this.consentService.getAccountCategory()
      .subscribe((res: any) => {
        if (res) {
          this.accountCategories = res.account_categories[0].groups[0].account_types;
          // console.log('CATEGORIES', this.accountCategories)
          let fipid = JSON.parse(localStorage.getItem('FIP_ENTITY_ID'))
          let mobileNo = localStorage.getItem('MOBILE_NO')
          this.manualAccountDiscovery(this.accountCategories, fipid, mobileNo)
          // this.autoAccountDiscovery(this.accountCategories, mobileNo)
        }
      })
  }

  accountTxnId: any;
  autoAccountDiscovery(accountCategories, mobileNo) {
    let data = {
      account_types: accountCategories,
      identifiers: [
        {
          "type": "MOBILE",
          "value": mobileNo
        }
      ]
    }
    this.consentService.autoAccountDiscovery(data)
      .subscribe((res: any) => {
        this.discoveredAccounts = res.discovered_accounts;
        console.log('DISCOVERED ACCOUNTS AUTO', this.discoveredAccounts)
        this.accountTxnId = res.txn_id;
        this.mappingDiscoverdAccounts(this.discoveredAccounts);
      })
  }

  manualAccountDiscovery(accountCategories, fipid, mobileNo) {
    let data = {
      account_types: accountCategories,
      // fip_id: fipid[0],
      fip_id: 'ACME-FIP',
      identifiers: [
        {
          "type": "MOBILE",
          "value": mobileNo
        }
      ]
    }
    this.consentService.discoverAccount(data)
      .subscribe((res: any) => {
        this.discoveredAccounts = res.discovered_accounts;
        console.log('DISCOVERED ACCOUNTS MANUAL', this.discoveredAccounts)
        this.accountTxnId = res.txn_id;
        this.mappingDiscoverdAccounts(this.discoveredAccounts);
      })
  }

  mappingDiscoverdAccounts(accounts) {
    this.discoveredAccounts = accounts.map((data: any) => {
      return {
        linked: false,
        selected: false,
        id: data.id,
        fipName: "ACME FIP",
        accountRefId: "7b905b8f-032a-40ec-8101-94762e774c46",
        linkRefNumber: "N/A",
        accType: data.account_sub_type_ID,
        fipId: "ACME-FIP",
        fiType: data.type_ID,
        maskedAccNumber: data.masked_account_number
      }
    })
  }

  selectedAccounts: any[] = [];
  // ischecked: boolean = false;
  selectAccount(event, account) {
    if (event.checked == true) {
      console.log('if')
      // this.ischecked = true;
      this.selectedAccounts.push(account);
    } else if (this.selectedAccounts.indexOf(account) !== -1) {
      console.log('else if')
      this.selectedAccounts.splice(this.selectedAccounts.indexOf(account), 1);
    }
    console.log(this.selectedAccounts)
  }

  linkObject: any;
  successLinkRes: any;
  ref_number: any;
  getOtp(selectedAccounts) {
    if (selectedAccounts.length != 0) {
      console.log(selectedAccounts)
      this.enableOTPContainer = true;
      this.enableOtpButton = false;
      this.enableProceedBtn = true;
      let accnts = []
      selectedAccounts.forEach(element => {
        accnts.push(element.id)
      });
      this.linkObject = {
        fip_id: "ACME-FIP",
        accounts: accnts
      }
      this.consentService.accountLink(this.linkObject)
        .subscribe((res: any) => {
          if (res) {
            console.log(res)
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

  getLinkedAccounts() {
    this.consentService.getLinkedAccounts()
      .subscribe((res: any) => {
        if (res) {
          this.linkedAccounts = res.accounts
          // console.log('Linked Accounts', this.linkedAccounts)
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
        }
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
          // console.log('FIP Lists', res)
          this.fipList = res.FIPs;
          this.filterFips(this.fipList)
        }
      })
  }

  filteredFips: any
  // FILTERING FIPs
  filterFips(fips) {
    return this.filteredFips = fips.slice();
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

  selectFip(event, fip) {
    console.log(event)
    console.log(fip)
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
    console.log(event)
    if (event.checked) {
      this.disableApproveBtn = false; ``
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
