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
import { RouterModule, Routes } from '@angular/router';
import { CycleCountFindComponent } from './cycle-count-find/cycle-count-find.component';
import { CycleCountCreateComponent } from './cycle-count-create/cycle-count-create.component';
import { CycleCountRecordComponent } from './cycle-count-record/cycle-count-record.component';
import { CycleCountReviewComponent } from './cycle-count-review/cycle-count-review.component';
import { CycleCountReportComponent } from './cycle-count-report/cycle-count-report.component';

const routes: Routes = [
  { path: '', redirectTo: 'create', pathMatch: 'full' },
  { path: 'create', component: CycleCountCreateComponent },
  { path: 'find', component: CycleCountFindComponent },
  { path: 'record/:sessionId', component: CycleCountRecordComponent },
  { path: 'review/:sessionId', component: CycleCountReviewComponent },
  { path: 'report/:sessionId', component: CycleCountReportComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CycleCountRoutingModule {}
