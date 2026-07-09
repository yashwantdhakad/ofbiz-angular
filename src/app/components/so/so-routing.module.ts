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
import { SOComponent } from './so/so.component';
import { CreateSOComponent } from './create-so/create-so.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: SOComponent, data: { title: 'SO.TITLE' } },
      { path: 'create', component: CreateSOComponent, data: { title: 'SO.CREATE_TITLE' } },
      {
        path: ':id',
        loadChildren: () => import('./so-detail/so-detail.module').then((m) => m.SoDetailModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SOModuleRouting {}
