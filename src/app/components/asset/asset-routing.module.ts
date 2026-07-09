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
import { AssetsComponent } from './assets/assets.component';
import { CreateAssetComponent } from './create-asset/create-asset.component';
import { AssetMoveComponent } from './asset-move/asset-move.component';
import { ReceiveAssetProductComponent } from './receive-asset-product/receive-asset-product.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: AssetsComponent, data: { title: 'MENU.ASSETS' } },
      { path: 'inspection', component: AssetsComponent, data: { title: 'MENU.INSPECTION_QUEUE' } },
      { path: 'create', component: CreateAssetComponent, data: { title: 'MENU.CREATE_ASSET' } },
      { path: 'create/product', component: ReceiveAssetProductComponent, data: { title: 'ASSET.RECEIVE_ASSET' } },
      { path: 'move', component: AssetMoveComponent, data: { title: 'MENU.ASSET_MOVE' } },
      {
        path: ':assetId',
        loadChildren: () => import('./asset-detail/asset-detail.module').then((m) => m.AssetDetailModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AssetRoutingModule {}
