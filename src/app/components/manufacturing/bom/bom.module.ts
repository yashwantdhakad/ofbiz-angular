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
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { MaterialModule } from '../../common/material/material.module';
import { BomRoutingModule } from './bom-routing.module';
import { BomsComponent } from './boms/boms.component';
import { BomDetailComponent } from './bom-detail/bom-detail.component';
import { BomCreateComponent } from './bom-create/bom-create.component';
import { BomAddComponentDialogComponent } from './bom-add-component-dialog/bom-add-component-dialog.component';
import { BomCreateItemDialogComponent } from './bom-create-item-dialog/bom-create-item-dialog.component';
import { BomProductDialogComponent } from './bom-product-dialog/bom-product-dialog.component';

@NgModule({
  declarations: [
    BomsComponent,
    BomDetailComponent,
    BomCreateComponent,
    BomAddComponentDialogComponent,
    BomCreateItemDialogComponent,
    BomProductDialogComponent,
  ],
  imports: [
    CommonModule,
    BomRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
})
export class BomModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
