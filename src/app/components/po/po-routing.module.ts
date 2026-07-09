/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { POComponent } from './po/po.component';
import { CreatePOComponent } from './create-po/create-po.component';

const poQuoteRouteData = {
  isQuoteMode: true,
  orderTypeId: 'PURCHASE_QUOTE',
  detailBasePath: '/pos/quotes',
  listBasePath: '/pos/quotes',
  pageTitle: 'PO.QUOTE_TITLE',
};

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: POComponent, data: { title: 'PO.TITLE' } },
      { path: 'create', component: CreatePOComponent, data: { title: 'PO.CREATE_TITLE' } },
      { path: 'quotes', component: POComponent, data: { ...poQuoteRouteData, title: 'PO.QUOTE_TITLE' } },
      { path: 'quotes/create', component: CreatePOComponent, data: { ...poQuoteRouteData, title: 'PO.CREATE_QUOTE_TITLE' } },
      {
        path: 'quotes/:id',
        loadChildren: () => import('./po-detail/po-detail.module').then((m) => m.PoDetailModule),
        data: { ...poQuoteRouteData, title: 'PO.QUOTE_DETAIL_TITLE' },
      },
      {
        path: ':id',
        loadChildren: () => import('./po-detail/po-detail.module').then((m) => m.PoDetailModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class POModuleRouting {}
