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
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

import { PODetailComponent } from './po-detail.component';
import { POReceiveComponent } from '../po-receive/po-receive.component';
import { AddSupplierDialogComponent } from '../add-supplier-dialog/add-supplier-dialog.component';
import { POReceiveLocationDialogComponent } from '../po-receive-location-dialog/po-receive-location-dialog.component';
import { PoMaterialModule } from '../../../components/common/material/po-material.module';
import { AddEditAddressComponent } from '../../party/add-edit-address/add-edit-address.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { StatusHistoryIconComponent } from '../../common/status-history/status-history-icon.component';
import { BarcodeInputComponent } from '../../common/barcode-input/barcode-input.component';
import { LandedCostAllocationDialogComponent } from '../landed-cost-allocation-dialog/landed-cost-allocation-dialog.component';

@NgModule({
  declarations: [
    PODetailComponent,
    POReceiveComponent,
    AddSupplierDialogComponent,
    POReceiveLocationDialogComponent,
    LandedCostAllocationDialogComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: PODetailComponent, data: { title: 'PO.DETAIL_TITLE' } },
      { path: 'receive', component: POReceiveComponent, data: { title: 'PO.RECEIVE_PAGE_TITLE' } },
    ]),
    FormsModule,
    ReactiveFormsModule,
    PoMaterialModule,
    StatusHistoryIconComponent,
    BarcodeInputComponent,
    AddEditAddressComponent,
    ShippingInstructionDialogComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
})
export class PoDetailModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
