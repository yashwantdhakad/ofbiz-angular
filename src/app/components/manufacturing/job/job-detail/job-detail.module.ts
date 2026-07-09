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

import { JobDetailComponent } from './job-detail.component';
import { JobAssignWorkerDialogComponent } from './job-assign-worker-dialog.component';
import { JobNoteDialogComponent } from './job-note-dialog.component';
import { CompleteTaskDialogComponent } from './complete-task-dialog.component';
import { SetConsumableInventoryDialogComponent } from '../set-consumable-inventory-dialog/set-consumable-inventory-dialog.component';
import { AddJobContentDialogComponent } from '../add-job-content-dialog/add-job-content-dialog.component';
import { ConsumableItemComponent } from '../../consumable-item/consumable-item.component';
import { ProduceItemComponent } from '../../produce-item/produce-item.component';
import { SteelCuttingDialogComponent } from './steel-cutting-dialog/steel-cutting-dialog.component';
import { ManufacturingMaterialModule } from '../../../../components/common/material/manufacturing-material.module';
import { StatusHistoryIconComponent } from '../../../common/status-history/status-history-icon.component';
import { ConfirmationDialogComponent } from '../../../common/confirmation-dialog/confirmation-dialog.component';

@NgModule({
  declarations: [
    JobDetailComponent,
    JobAssignWorkerDialogComponent,
    JobNoteDialogComponent,
    CompleteTaskDialogComponent,
    SetConsumableInventoryDialogComponent,
    AddJobContentDialogComponent,
    ConsumableItemComponent,
    ProduceItemComponent,
  ],
  imports: [
    SteelCuttingDialogComponent,
    CommonModule,
    RouterModule.forChild([
      { path: '', component: JobDetailComponent, data: { title: 'MANUFACTURING.DETAIL_TITLE' } },
    ]),
    FormsModule,
    ReactiveFormsModule,
    ManufacturingMaterialModule,
    StatusHistoryIconComponent,
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
export class JobDetailModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
