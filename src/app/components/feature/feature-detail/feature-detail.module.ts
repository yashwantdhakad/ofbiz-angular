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

import { FeatureDetailComponent } from './feature-detail.component';
import { EditFeatureComponent } from '../edit-feature/edit-feature.component';
import { AddToFeatureGroupComponent } from '../add-to-feature-group/add-to-feature-group.component';
import { AddToProductComponent } from '../add-to-product/add-to-product.component';
import { FeatureMaterialModule } from '../../../components/common/material/feature-material.module';

@NgModule({
  declarations: [
    FeatureDetailComponent,
    EditFeatureComponent,
    AddToFeatureGroupComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: FeatureDetailComponent, data: { title: 'FEATURE.DETAIL_TITLE' } },
    ]),
    FormsModule,
    ReactiveFormsModule,
    FeatureMaterialModule,
    AddToProductComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
})
export class FeatureDetailModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
