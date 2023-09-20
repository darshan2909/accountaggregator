import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  // NO LAZY LOADING
  { path: '', redirectTo: 'authentication', pathMatch: 'full' },

  // LAZY LOADING
  { path: '', loadChildren: () => import('./authentication/authentication.module').then(item => item.AuthenticationModule) },
  { path: '', loadChildren: () => import('./consent/consent.module').then(item => item.ConsentModule) },

  // WILDCARD ROUTES : NO LAZY LOADING
  // { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
