import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConsentRoutingModule } from './consent-routing.module';
import { ConsentComponent } from './_pages/consent/consent.component';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    ConsentComponent
  ],
  imports: [
    CommonModule,
    ConsentRoutingModule,
    SharedModule
  ]
})
export class ConsentModule { }
