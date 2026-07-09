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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

interface ProductType {
  productTypeId: string;
  description: string;
  product_type_id?: string;
}

@Component({
  standalone: false,
  selector: 'app-create-product',
  templateUrl: './create-product.component.html',
  styleUrls: ['./create-product.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateProductComponent implements OnInit {
  isLoading = signal<boolean>(false);
  productForm: FormGroup;
  productTypes = signal<ProductType[]>([]);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private productService: ProductService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    this.productForm = this.fb.group({
      productName: ['', Validators.required],
      internalName: [''],
      productTypeId: ['FINISHED_GOOD', Validators.required],
      description: [''],
      price: [
        null,
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^\d+(\.\d{1,2})?$/)
        ]
      ],
    });
  }

  ngOnInit(): void {
    this.fetchProductTypes();
  }

  createProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const values = this.productForm.value;
    const payload = {
      ...values,
      internalName: values.internalName || values.productName,
    };

    this.productService
      .createProduct(payload)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          const productId = data?.productId || data?.product?.productId;
          if (productId) {
            this.snackbarService.showSuccess(
              this.translate.instant('PRODUCT.CREATED_SUCCESS')
            );
            this.router.navigate([`/products/${productId}`]);
          } else {
            this.snackbarService.showError(
              this.translate.instant('PRODUCT.FAILED_CREATE')
            );
          }
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant('PRODUCT.ERROR_CREATE')
          );
        },
      });
  }

  fetchProductTypes(): void {
    this.commonService.getLookupResults({}, 'product_type')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const rawTypes = Array.isArray(data) ? data : [data];
          this.productTypes.set(
            rawTypes
              .map((item: ProductType) => ({
                ...item,
                productTypeId: item?.productTypeId || item?.product_type_id || '',
                description: item?.description || item?.productTypeId || item?.product_type_id || '',
              }))
              .filter((item: ProductType) => !!item.productTypeId)
          );
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant('PRODUCT.FETCH_TYPES_ERROR')
          );
        },
      });
  }

  trackByProductType = (index: number, productType: ProductType): string =>
    productType?.productTypeId ?? String(index);
}
