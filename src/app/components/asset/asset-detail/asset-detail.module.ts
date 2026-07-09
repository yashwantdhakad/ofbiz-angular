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

import { AssetDetailComponent } from './asset-detail.component';
import { AssetLocationDialogComponent } from '../asset-location-dialog/asset-location-dialog.component';
import { AssetUnitCostDialogComponent } from '../asset-unit-cost-dialog/asset-unit-cost-dialog.component';
import { AssetOwnerDialogComponent } from '../asset-owner-dialog/asset-owner-dialog.component';
import { AssetStatusDialogComponent } from '../asset-status-dialog/asset-status-dialog.component';
import { DisassemblyDialogComponent } from '../disassembly-dialog/disassembly-dialog.component';
import { InspectionNoteDialogComponent } from '../inspection-note-dialog/inspection-note-dialog.component';
import { AssetMaterialModule } from '../../../components/common/material/asset-material.module';
import { StatusHistoryIconComponent } from '../../common/status-history/status-history-icon.component';

@NgModule({
  declarations: [
    AssetDetailComponent,
    AssetLocationDialogComponent,
    AssetUnitCostDialogComponent,
    AssetOwnerDialogComponent,
    AssetStatusDialogComponent,
    DisassemblyDialogComponent,
    InspectionNoteDialogComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: AssetDetailComponent, data: { title: 'ASSET.DETAILS' } },
    ]),
    FormsModule,
    ReactiveFormsModule,
    AssetMaterialModule,
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
export class AssetDetailModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
