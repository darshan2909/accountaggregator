import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConsentComponent } from './_pages/consent/consent.component';

const routes: Routes = [
  { path: 'consent', component: ConsentComponent, data: { title: 'consent' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsentRoutingModule { }
