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
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { MaterialModule } from '../../common/material/material.module';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { RoutingRoutingModule } from './routing-routing.module';
import { RoutingsComponent } from './routings/routings.component';
import { RoutingCreateComponent } from './routing-create/routing-create.component';
import { RoutingDetailComponent } from './routing-detail/routing-detail.component';
import { AddOperationDialogComponent } from './add-operation-dialog/add-operation-dialog.component';
import { AddDeliverableItemDialogComponent } from './add-deliverable-item-dialog/add-deliverable-item-dialog.component';
import { EditRoutingDialogComponent } from './edit-routing-dialog/edit-routing-dialog.component';
import { AddRoutingContentDialogComponent } from './add-routing-content-dialog/add-routing-content-dialog.component';

@NgModule({
  declarations: [
    RoutingsComponent,
    RoutingCreateComponent,
    RoutingDetailComponent,
    AddOperationDialogComponent,
    AddDeliverableItemDialogComponent,
    EditRoutingDialogComponent,
    AddRoutingContentDialogComponent,
  ],
  imports: [
    CommonModule,
    RoutingRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
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
export class RoutingModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
