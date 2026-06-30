import { Routes } from '@angular/router';

import { Layout } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home').then((m) => m.Home)
      }
    ]
  }
];
