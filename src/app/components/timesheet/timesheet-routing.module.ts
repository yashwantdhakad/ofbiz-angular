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
import { TimesheetListComponent } from './timesheet-list/timesheet-list.component';
import { TimesheetFormComponent } from './timesheet-form/timesheet-form.component';
import { TimesheetDetailComponent } from './timesheet-detail/timesheet-detail.component';

const routes: Routes = [
  { path: '', component: TimesheetListComponent, data: { title: 'TIMESHEET.TITLE' } },
  { path: 'create', component: TimesheetFormComponent, data: { title: 'TIMESHEET.CREATE_TITLE', mode: 'create' } },
  { path: ':id/edit', component: TimesheetFormComponent, data: { title: 'TIMESHEET.EDIT_TITLE', mode: 'edit' } },
  { path: ':id', component: TimesheetDetailComponent, data: { title: 'TIMESHEET.DETAIL_TITLE' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TimesheetRoutingModule {}
