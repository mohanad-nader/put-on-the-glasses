import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Put on the glasses',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'tester',
    title: 'Tester | Put on the glasses',
    loadComponent: () => import('./pages/tester/tester').then((m) => m.Tester),
  },
  { path: '**', redirectTo: '' },
];
