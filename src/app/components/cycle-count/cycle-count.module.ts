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
import { MaterialModule } from '../common/material/material.module';
import { CycleCountRoutingModule } from './cycle-count-routing.module';
import { CycleCountFindComponent } from './cycle-count-find/cycle-count-find.component';
import { CycleCountCreateComponent } from './cycle-count-create/cycle-count-create.component';
import { CycleCountRecordComponent } from './cycle-count-record/cycle-count-record.component';
import { CycleCountReviewComponent } from './cycle-count-review/cycle-count-review.component';
import { CycleCountReportComponent } from './cycle-count-report/cycle-count-report.component';
import { TranslateModule } from '@ngx-translate/core';
import { StatusChipComponent } from '../common/status-chip/status-chip.component';

@NgModule({
  declarations: [
    CycleCountCreateComponent,
    CycleCountFindComponent,
    CycleCountRecordComponent,
    CycleCountReviewComponent,
    CycleCountReportComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TranslateModule,
    CycleCountRoutingModule,
    StatusChipComponent,
  ],
})
export class CycleCountModule {}
