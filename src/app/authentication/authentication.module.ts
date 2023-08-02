import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthenticationRoutingModule } from './authentication-routing.module';
import { LoginComponent } from './_pages/login/login.component';
import { RegisterComponent } from './_pages/register/register.component';
import { SharedModule } from '../shared/shared.module';
import { GenerateTokenComponent } from './_pages/generate-token/generate-token.component';


@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    GenerateTokenComponent
  ],
  imports: [
    CommonModule,
    AuthenticationRoutingModule,
    SharedModule,
  ]
})
export class AuthenticationModule { }
