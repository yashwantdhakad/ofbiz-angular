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
import { SalesInvoicesComponent } from './sales-invoices/sales-invoices.component';
import { PurchaseInvoicesComponent } from './purchase-invoices/purchase-invoices.component';
import { InvoiceDetailComponent } from './invoice-detail/invoice-detail.component';
import { ReconcileInvoiceComponent } from './reconcile-invoice/reconcile-invoice.component';

const routes: Routes = [
  { path: '', redirectTo: 'sales', pathMatch: 'full' },
  { path: 'sales', component: SalesInvoicesComponent },
  { path: 'sales/:id', component: InvoiceDetailComponent, data: { mode: 'sales' } },
  { path: 'purchase', component: PurchaseInvoicesComponent },
  { path: 'purchase/:id', component: InvoiceDetailComponent, data: { mode: 'purchase' } },
  { path: 'purchase/:id/reconcile', component: ReconcileInvoiceComponent, data: { mode: 'purchase' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InvoiceRoutingModule {}
