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
import { DragDropModule } from '@angular/cdk/drag-drop';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { CrmRoutingModule } from './crm-routing.module';
import { PipelineComponent } from './pipeline/pipeline.component';
import { OpportunityDetailComponent } from './opportunity-detail/opportunity-detail.component';
import { OpportunityEditDialogComponent } from './opportunity-edit-dialog/opportunity-edit-dialog.component';
import { OpportunityFormComponent } from './opportunity-form/opportunity-form.component';
import { SharedModule } from '../common/shared/shared-module';
import { SharedPartyMaterialModule } from '../common/material/shared-party-material.module';
import { ConfirmationDialogComponent } from '../common/confirmation-dialog/confirmation-dialog.component';

@NgModule({
  declarations: [
    PipelineComponent,
    OpportunityDetailComponent,
    OpportunityEditDialogComponent,
    OpportunityFormComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    DragDropModule,
    CrmRoutingModule,
    SharedPartyMaterialModule,
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
export class CrmModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
