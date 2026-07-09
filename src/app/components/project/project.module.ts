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
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { ProjectRoutingModule } from './project-routing.module';
import { ProjectDashboardComponent } from './project-dashboard/project-dashboard.component';
import { ProjectFormComponent } from './project-form/project-form.component';
import { ProjectDetailComponent } from './project-detail/project-detail.component';
import { ProjectEditDialogComponent } from './project-edit-dialog/project-edit-dialog.component';
import { ProjectPlanningComponent } from './project-planning/project-planning.component';
import { SharedModule } from '../common/shared/shared-module';
import { SharedPartyMaterialModule } from '../common/material/shared-party-material.module';
import { ConfirmationDialogComponent } from '../common/confirmation-dialog/confirmation-dialog.component';

@NgModule({
  declarations: [
    ProjectDashboardComponent,
    ProjectFormComponent,
    ProjectDetailComponent,
    ProjectEditDialogComponent,
    ProjectPlanningComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ProjectRoutingModule,
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
export class ProjectModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
