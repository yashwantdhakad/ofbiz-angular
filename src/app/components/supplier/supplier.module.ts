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
import { SupplierRoutingModule } from './supplier-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

// Components
import { SupplierComponent } from './supplier/supplier.component';
import { CreateSupplierComponent } from './create-supplier/create-supplier.component';
import { SupplierDetailComponent } from './supplier-detail/supplier-detail.component';
import { EditSupplierComponent } from './edit-supplier/edit-supplier.component';
import { SharedModule } from '../common/shared/shared-module';

// Angular Material Modules
import { SharedPartyMaterialModule } from '../../components/common/material/shared-party-material.module';

@NgModule({
    declarations: [
        SupplierComponent,
        CreateSupplierComponent,
        SupplierDetailComponent,
        EditSupplierComponent,
    ],
    imports: [
        CommonModule,
        SupplierRoutingModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,

        // Material Modules
        SharedPartyMaterialModule,
        // Shared Module
        SharedModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }),
    ],
})
export class SupplierModule { }

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
