import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class AesEncryptionService {

  private readonly cipherKey = '74a4ca4e-1474-4f';
  private readonly initVector = '72133bd4-79c8-4d';
  private readonly key;
  private readonly iv;

  constructor() { 
    this.key = CryptoJS.enc.Utf8.parse(this.cipherKey);
    this.iv = CryptoJS.enc.Utf8.parse(this.initVector);
  }

  encryptUsingAES256(text: string) {
    if (text) {
      return CryptoJS.AES.encrypt(text, this.key, {
        keySize: 16,
        iv: this.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
    } else {
      return null;
    }
  }

  decryptUsingAES256(text: string) {
    if (text) {
      return CryptoJS.AES.decrypt(text, this.key, {
        keySize: 16,
        iv: this.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8);
    } else {
      return null;
    }
  }
}
