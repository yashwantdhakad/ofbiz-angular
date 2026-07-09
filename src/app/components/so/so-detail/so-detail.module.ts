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

import { SODetailComponent } from './so-detail.component';
import { AddBillToCustomerDialogComponent } from '../add-bill-to-customer-dialog/add-bill-to-customer-dialog.component';
import { ShipToPhoneDialogComponent } from '../ship-to-phone-dialog/ship-to-phone-dialog.component';
import { AddOrderAdjustmentDialogComponent } from '../add-order-adjustment-dialog/add-order-adjustment-dialog.component';
import { ItemComponent } from '../../order/item/item.component';
import { NoteComponent } from '../../order/note/note.component';
import { ContentComponent } from '../../order/content/content.component';
import { ProductItemComponent } from '../../order/product-item/product-item.component';
import { SoMaterialModule } from '../../../components/common/material/so-material.module';
import { AddEditAddressComponent } from '../../party/add-edit-address/add-edit-address.component';
import { AddEditPhoneComponent } from '../../party/add-edit-phone/add-edit-phone.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { StatusHistoryIconComponent } from '../../common/status-history/status-history-icon.component';

@NgModule({
  declarations: [
    SODetailComponent,
    AddBillToCustomerDialogComponent,
    ShipToPhoneDialogComponent,
    AddOrderAdjustmentDialogComponent,
    ItemComponent,
    NoteComponent,
    ContentComponent,
    ProductItemComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: SODetailComponent, data: { title: 'SO.DETAIL_TITLE' } },
    ]),
    FormsModule,
    ReactiveFormsModule,
    SoMaterialModule,
    StatusHistoryIconComponent,
    AddEditAddressComponent,
    AddEditPhoneComponent,
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
export class SoDetailModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
