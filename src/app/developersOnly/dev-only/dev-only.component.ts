import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DevOnlyService } from '../services/dev-only.service';

@Component({
  selector: 'app-dev-only',
  templateUrl: './dev-only.component.html',
  styleUrls: ['./dev-only.component.scss']
})
export class DevOnlyComponent implements OnInit {

  formData = new FormData();

  newForm: FormGroup;

  constructor(private devService: DevOnlyService) { }

  ngOnInit(): void {

    this.newForm = new FormGroup({
      commands: new FormControl('Something'),
      scheduleJobRequest: new FormControl('Something'),
      csvFile: new FormControl(null),
      name: new FormControl()
    });

  }

  file:any
  uploadFile(event) {
    this.file = (event.target as HTMLInputElement).files[0];
    this.newForm.patchValue({
      csvFile: this.file,
    });
    this.newForm.get('csvFile').updateValueAndValidity();

    // var formData: any = new FormData();
    this.formData.append('csvFile', this.newForm.get('csvFile').value);
    this.formData.append('commands', this.newForm.get('commands').value);
    this.formData.append('scheduleJobRequest', this.newForm.get('scheduleJobRequest').value);
    console.log(this.formData)
    // this.http.post('http://localhost:4000/api/create-user', formData).subscribe(
    //   (response) => console.log(response),
    //   (error) => {
    //     console.log(error.message);
    //   }
    // );
  }

  Submit(){
    console.log(this.file)
    if(this.file){
      this.devService.uploadJobs(this.formData)
      .subscribe((res:any) => {
        console.log(res)
      })
    }else{
      console.log('----')
    }
  }

}
