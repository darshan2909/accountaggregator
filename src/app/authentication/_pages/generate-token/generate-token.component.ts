import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../_services/auth/authentication.service';

@Component({
  selector: 'app-generate-token',
  templateUrl: './generate-token.component.html',
  styleUrls: ['./generate-token.component.scss']
})
export class GenerateTokenComponent implements OnInit {

  constructor(private authService: AuthenticationService) { }

  ngOnInit(): void {
    this.generateToken()
  }

  generateToken(){

  }

}
