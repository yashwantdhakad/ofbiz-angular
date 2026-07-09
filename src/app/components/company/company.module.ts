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
import { CompanyMaterialModule } from '../common/material/company-material.module';
import { TranslateModule } from '@ngx-translate/core';
import { CompanyRoutingModule } from './company-routing.module';
import { CompanyComponent } from './company/company.component';
import { CompanyIdPreferencesComponent } from './company-id-preferences/company-id-preferences.component';
import { CompanyPoApprovalSettingsComponent } from './company-po-approval-settings/company-po-approval-settings.component';
import { CompanyStoreFacilityOverviewComponent } from './company-store-facility-overview/company-store-facility-overview.component';
import { CompanyNameDialogComponent } from './company-name-dialog/company-name-dialog.component';

@NgModule({
  declarations: [
    CompanyComponent,
    CompanyNameDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CompanyMaterialModule,
    TranslateModule,
    CompanyIdPreferencesComponent,
    CompanyPoApprovalSettingsComponent,
    CompanyStoreFacilityOverviewComponent,
    CompanyRoutingModule,
  ],
})
export class CompanyModule {}
