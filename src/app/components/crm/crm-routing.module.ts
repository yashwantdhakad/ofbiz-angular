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
import { OpportunityDetailComponent } from './opportunity-detail/opportunity-detail.component';
import { OpportunityFormComponent } from './opportunity-form/opportunity-form.component';
import { PipelineComponent } from './pipeline/pipeline.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'pipeline', pathMatch: 'full' },
      { path: 'pipeline', component: PipelineComponent, data: { title: 'CRM.PIPELINE_TITLE' } },
      { path: 'opportunities/new', component: OpportunityFormComponent, data: { title: 'CRM.CREATE_OPPORTUNITY_TITLE', mode: 'create' } },
      { path: 'opportunities/:id/edit', component: OpportunityFormComponent, data: { title: 'CRM.EDIT_OPPORTUNITY_TITLE', mode: 'edit' } },
      { path: 'opportunities/:id', component: OpportunityDetailComponent, data: { title: 'CRM.OPPORTUNITY_DETAIL_TITLE' } },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrmRoutingModule {}
