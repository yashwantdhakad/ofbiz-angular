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
import { FeaturegroupRoutingModule } from './featuregroup-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

// Components
import { FeaturegroupsComponent } from './featuregroups/featuregroups.component';
import { CreateFeaturegroupComponent } from './create-featuregroup/create-featuregroup.component';
import { FeaturegroupDetailComponent } from './featuregroup-detail/featuregroup-detail.component';
import { AddCategoryFeatureGroupApplComponent } from './add-category-feature-group-appl/add-category-feature-group-appl.component';
import { AddProductFeatureGroupApplComponent } from './add-product-feature-group-appl/add-product-feature-group-appl.component';
import { EditFeaturegroupComponent } from './edit-featuregroup/edit-featuregroup.component';

// Shared Angular Material Module
import { MaterialModule } from '../../components/common/material/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

@NgModule({
  declarations: [
    FeaturegroupsComponent,
    CreateFeaturegroupComponent,
    FeaturegroupDetailComponent,
    AddCategoryFeatureGroupApplComponent,
    AddProductFeatureGroupApplComponent,
    EditFeaturegroupComponent,
  ],
  imports: [
    CommonModule,
    FeaturegroupRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ],
})
export class FeaturegroupModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}