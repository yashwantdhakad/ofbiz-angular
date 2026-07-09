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
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { MaterialModule } from '../common/material/material.module';
import { LotRoutingModule } from './lot-routing.module';
import { LotListComponent } from './lot-list/lot-list.component';
import { LotCreateComponent } from './lot-create/lot-create.component';
import { LotDetailComponent } from './lot-detail/lot-detail.component';
import { LotPropertyDialogComponent } from './lot-property-dialog/lot-property-dialog.component';
import { LotTraceabilityTreeComponent } from './lot-traceability-tree/lot-traceability-tree.component';

@NgModule({
  declarations: [
    LotListComponent,
    LotCreateComponent,
    LotDetailComponent,
    LotPropertyDialogComponent,
    LotTraceabilityTreeComponent,
  ],
  imports: [
    CommonModule,
    LotRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
})
export class LotModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
