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
import { SupportListComponent } from './support-list/support-list.component';
import { SupportSubmitComponent } from './support-submit/support-submit.component';
import { SupportAdminListComponent } from './support-admin-list/support-admin-list.component';
import { SupportDetailComponent } from './support-detail/support-detail.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'tickets', pathMatch: 'full' },
      { path: 'tickets', component: SupportListComponent, data: { title: 'SUPPORT.MY_TICKETS' } },
      { path: 'submit', component: SupportSubmitComponent, data: { title: 'SUPPORT.SUBMIT_TICKET' } },
      { path: 'admin', component: SupportAdminListComponent, data: { title: 'SUPPORT.ADMIN_BOARD' } },
      { path: 'tickets/:id', component: SupportDetailComponent, data: { title: 'SUPPORT.TICKET_DETAIL' } }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SupportRoutingModule { }
