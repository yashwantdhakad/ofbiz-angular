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
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FinanceRoutingModule } from './finance-routing.module';
import { MaterialModule } from '../common/material/material.module';
import { ChartOfAccountsComponent } from './chart-of-accounts/chart-of-accounts.component';
import { GlAccountDialogComponent } from './gl-account-dialog/gl-account-dialog.component';
import { JournalEntriesComponent } from './journal-entries/journal-entries.component';
import { JournalEntryDialogComponent } from './journal-entry-dialog/journal-entry-dialog.component';

@NgModule({
  declarations: [
    ChartOfAccountsComponent,
    GlAccountDialogComponent,
    JournalEntriesComponent,
    JournalEntryDialogComponent,
  ],
  imports: [
    CommonModule,
    FinanceRoutingModule,
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
export class FinanceModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
