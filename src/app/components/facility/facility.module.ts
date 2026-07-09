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
import { FacilityRoutingModule } from './facility-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

// Components
import { FacilityComponent } from './facility/facility.component';
import { FacilityDetailComponent } from './facility-detail/facility-detail.component';
import { FacilityCreateComponent } from './facility-create/facility-create.component';
import { FacilityLocationDialogComponent } from './facility-location-dialog/facility-location-dialog.component';
import { FacilityNameDialogComponent } from './facility-name-dialog/facility-name-dialog.component';
import { FacilityAddressDialogComponent } from './facility-address-dialog/facility-address-dialog.component';

// Angular Material Modules
import { MaterialModule } from '../common/material/material.module';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    FacilityComponent,
    FacilityDetailComponent,
    FacilityCreateComponent,
    FacilityLocationDialogComponent,
    FacilityNameDialogComponent,
    FacilityAddressDialogComponent,
  ],
  imports: [
    CommonModule,
    FacilityRoutingModule,
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
    })
  ]
})
export class FacilityModule { }
