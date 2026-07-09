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
import { RequirementListComponent } from './requirement-list/requirement-list.component';
import { RequirementCreateComponent } from './requirement-create/requirement-create.component';
import { RequirementDetailComponent } from './requirement-detail/requirement-detail.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: RequirementListComponent, data: { title: 'REQUIREMENT.TITLE' } },
      { path: 'create', component: RequirementCreateComponent, data: { title: 'REQUIREMENT.CREATE_TITLE' } },
      { path: ':id', component: RequirementDetailComponent, data: { title: 'REQUIREMENT.DETAIL_TITLE' } },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RequirementRoutingModule {}
