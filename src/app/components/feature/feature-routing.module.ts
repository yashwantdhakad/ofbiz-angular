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
import { FeaturesComponent } from './features/features.component';
import { CreateFeatureComponent } from './create-feature/create-feature.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: FeaturesComponent, data: { title: 'FEATURE.TITLE' } },
      { path: 'create', component: CreateFeatureComponent, data: { title: 'FEATURE.CREATE_TITLE' } },
      {
        path: ':productFeatureId',
        loadChildren: () => import('./feature-detail/feature-detail.module').then((m) => m.FeatureDetailModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FeatureRoutingModule {}
