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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { RouterModule } from '@angular/router';

import { ConfirmationDialogComponent } from '../common/confirmation-dialog/confirmation-dialog.component';
import { SharedModule } from '../common/shared/shared-module';
import { AssetMaterialModule } from '../common/material/asset-material.module';
import { FixedAssetRoutingModule } from './fixed-asset-routing.module';
import { FixedAssetsComponent } from './fixed-assets/fixed-assets.component';
import { FixedAssetDetailComponent } from './fixed-asset-detail/fixed-asset-detail.component';
import { FixedAssetEditDialogComponent } from './fixed-asset-edit-dialog/fixed-asset-edit-dialog.component';
import { FixedAssetFormComponent } from './fixed-asset-form/fixed-asset-form.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [FixedAssetsComponent, FixedAssetDetailComponent, FixedAssetFormComponent, FixedAssetEditDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FixedAssetRoutingModule,
    AssetMaterialModule,
    SharedModule,
    ConfirmationDialogComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
})
export class FixedAssetModule {}
