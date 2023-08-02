import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DevOnlyService {

  // baseUrl_EspAdhocScheduler: string = `${environment.apiEndPoint_EspAdhocScheduler}`;
  baseUrl_EspAdhocScheduler = 'http://localhost:8088/e-pulse/v1/esp-adhoc-scheduler/'

  constructor(private http: HttpClient) { }

  uploadJobs(jobRequest) {
    console.log(jobRequest)
    return this.http.put(`${this.baseUrl_EspAdhocScheduler}batchFile`, jobRequest, {responseType: 'text'})
  }
}
