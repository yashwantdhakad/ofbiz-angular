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
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

import { ProductDetailComponent } from './product-detail.component';
import { ProductEditComponent } from '../product-edit/product-edit.component';
import { AddEditProductPriceComponent } from '../add-edit-product-price/add-edit-product-price.component';
import { ProductContentComponent } from '../product-content/product-content.component';
import { ProductAssocComponent } from '../product-assoc/product-assoc.component';
import { AddEditProductCategoryComponent } from '../add-edit-product-category/add-edit-product-category.component';
import { AddProductFacilityDialogComponent } from '../add-product-facility-dialog/add-product-facility-dialog.component';
import { AddProductFacilityLocationDialogComponent } from '../add-product-facility-location-dialog/add-product-facility-location-dialog.component';
import { AddEditProductIdentificationComponent } from '../add-edit-product-identification/add-edit-product-identification.component';
import { ProductShippingConfigDialogComponent } from '../product-shipping-config-dialog/product-shipping-config-dialog.component';
import { SupplierProductDialogComponent } from '../../supplier/supplier-product-dialog/supplier-product-dialog.component';
import { AddToProductComponent } from '../../feature/add-to-product/add-to-product.component';
import { ProductMaterialModule } from '../../../components/common/material/product-material.module';

@NgModule({
  declarations: [
    ProductDetailComponent,
    ProductEditComponent,
    AddEditProductPriceComponent,
    ProductContentComponent,
    ProductAssocComponent,
    AddEditProductCategoryComponent,
    AddProductFacilityDialogComponent,
    AddProductFacilityLocationDialogComponent,
    AddEditProductIdentificationComponent,
    ProductShippingConfigDialogComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: ProductDetailComponent, data: { title: 'PRODUCT.DETAIL_TITLE' } },
    ]),
    FormsModule,
    ReactiveFormsModule,
    ProductMaterialModule,
    SupplierProductDialogComponent,
    AddToProductComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
})
export class ProductDetailModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
