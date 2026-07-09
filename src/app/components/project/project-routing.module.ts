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
import { ProjectDashboardComponent } from './project-dashboard/project-dashboard.component';
import { ProjectFormComponent } from './project-form/project-form.component';
import { ProjectDetailComponent } from './project-detail/project-detail.component';
import { ProjectPlanningComponent } from './project-planning/project-planning.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ProjectDashboardComponent,
    data: { title: 'PROJECTS.TITLE' },
  },
  {
    path: 'new',
    component: ProjectFormComponent,
    data: { title: 'PROJECTS.CREATE_TITLE', mode: 'create' },
  },
  {
    path: 'planning',
    component: ProjectPlanningComponent,
    data: { title: 'PROJECTS.PLANNING_TITLE' },
  },
  {
    path: ':id/edit',
    component: ProjectFormComponent,
    data: { title: 'PROJECTS.EDIT_TITLE', mode: 'edit' },
  },
  {
    path: ':id',
    component: ProjectDetailComponent,
    data: { title: 'PROJECTS.DETAIL_TITLE' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectRoutingModule {}
