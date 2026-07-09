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
import { ShipmentRoutingModule } from './shipment-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

// Components
import { ShipmentComponent } from './shipment/shipment.component';
import { CreateShipmentComponent } from './create-shipment/create-shipment.component';
import { ShipmentDetailComponent } from './shipment-detail/shipment-detail.component';
import { SalesShipmentDetailComponent } from './sales-shipment-detail/sales-shipment-detail.component';
import { SalesShipmentPackageDialogComponent } from './sales-shipment-package-dialog/sales-shipment-package-dialog.component';
import { SalesShipmentPhoneDialogComponent } from './sales-shipment-phone-dialog/sales-shipment-phone-dialog.component';
import { SalesShipmentTrackingDialogComponent } from './sales-shipment-tracking-dialog/sales-shipment-tracking-dialog.component';

// Shared Angular Material Module
import { ShipmentMaterialModule } from '../../components/common/material/shipment-material.module';
import { AddEditAddressComponent } from '../party/add-edit-address/add-edit-address.component';
import { ShippingInstructionDialogComponent } from '../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { StatusHistoryIconComponent } from '../common/status-history/status-history-icon.component';

@NgModule({
  declarations: [
    ShipmentComponent,
    CreateShipmentComponent,
    ShipmentDetailComponent,
    SalesShipmentDetailComponent,
    SalesShipmentPackageDialogComponent,
    SalesShipmentPhoneDialogComponent,
    SalesShipmentTrackingDialogComponent,
  ],
  imports: [
    CommonModule,
    ShipmentRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ShipmentMaterialModule,
    StatusHistoryIconComponent,
    AddEditAddressComponent,
    ShippingInstructionDialogComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ],
})
export class ShipmentModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
