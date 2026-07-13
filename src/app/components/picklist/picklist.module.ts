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

import { PicklistRoutingModule } from './picklist-routing.module';
import { PicklistsComponent } from './picklists/picklists.component';
import { PicklistOrderItemsDialogComponent } from './picklists/picklist-order-items-dialog.component';
import { PicklistCreateComponent } from './picklist-create/picklist-create.component';
import { PicklistCreateItemsDialogComponent } from './picklist-create/picklist-create-items-dialog.component';
import { PicklistDetailComponent } from './picklist-detail/picklist-detail.component';
import { PicklistAssignPickerDialogComponent } from './picklist-detail/picklist-assign-picker-dialog.component';
import { PackingStationComponent } from './packing-station/packing-station.component';
import { MaterialModule } from '../../components/common/material/material.module';
import { StatusHistoryIconComponent } from '../common/status-history/status-history-icon.component';

@NgModule({
  declarations: [
    PicklistsComponent,
    PicklistDetailComponent,
    PicklistAssignPickerDialogComponent,
    PicklistOrderItemsDialogComponent,
    PicklistCreateComponent,
    PicklistCreateItemsDialogComponent,
    PackingStationComponent,
  ],
  imports: [
    CommonModule,
    PicklistRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    StatusHistoryIconComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
})
export class PicklistModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
