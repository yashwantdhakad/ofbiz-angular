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
import { ShipmentComponent } from './shipment/shipment.component';
import { CreateShipmentComponent } from './create-shipment/create-shipment.component';
import { ShipmentDetailComponent } from './shipment-detail/shipment-detail.component';
import { SalesShipmentDetailComponent } from './sales-shipment-detail/sales-shipment-detail.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: ShipmentComponent, data: { title: 'SHIPMENT.TITLE' } },
      { path: 'create', component: CreateShipmentComponent, data: { title: 'SHIPMENT.CREATE_TITLE' } },
      { path: 'sales/:shipmentId', component: SalesShipmentDetailComponent, data: { title: 'SHIPMENT.SALES_DETAIL_TITLE' } },
      { path: ':shipmentId', component: ShipmentDetailComponent, data: { title: 'SHIPMENT.DETAIL_TITLE' } },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShipmentRoutingModule {}
