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
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { InvoiceMaterialModule } from '../common/material/invoice-material.module';
import { InvoiceRoutingModule } from './invoice-routing.module';
import { SalesInvoicesComponent } from './sales-invoices/sales-invoices.component';
import { PurchaseInvoicesComponent } from './purchase-invoices/purchase-invoices.component';
import { InvoiceDetailComponent } from './invoice-detail/invoice-detail.component';
import { ReconcileInvoiceComponent } from './reconcile-invoice/reconcile-invoice.component';
import { AddPaymentDialogComponent } from './add-payment-dialog/add-payment-dialog.component';
import { StatusHistoryIconComponent } from '../common/status-history/status-history-icon.component';

@NgModule({
  declarations: [
    SalesInvoicesComponent,
    PurchaseInvoicesComponent,
    InvoiceDetailComponent,
    ReconcileInvoiceComponent,
    AddPaymentDialogComponent,
  ],
  imports: [
    CommonModule,
    InvoiceRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    InvoiceMaterialModule,
    StatusHistoryIconComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
})
export class InvoiceModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
