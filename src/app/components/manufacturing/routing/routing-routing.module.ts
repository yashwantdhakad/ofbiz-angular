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
import { RoutingsComponent } from './routings/routings.component';
import { RoutingCreateComponent } from './routing-create/routing-create.component';
import { RoutingDetailComponent } from './routing-detail/routing-detail.component';

const routes: Routes = [
  { path: 'create', component: RoutingCreateComponent, data: { title: 'MANUFACTURING.CREATE_ROUTING_TITLE' } },
  { path: ':workEffortId', component: RoutingDetailComponent, data: { title: 'MANUFACTURING.ROUTING_DETAIL' } },
  { path: '', component: RoutingsComponent, data: { title: 'MANUFACTURING.ROUTINGS_TITLE' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RoutingRoutingModule {}
