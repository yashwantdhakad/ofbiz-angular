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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, map, startWith, switchMap } from 'rxjs/operators';

interface ProductOption {
  productId?: string;
  productName?: string;
  name?: string;
  internalName?: string;
}

interface CategoryProductDialogData {
  productCategoryId?: string;
  productId?: string;
  fromDate?: string;
  thruDate?: string;
}
import { CategoryService } from '@ofbiz/services/category/category.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-add-edit-product',
  templateUrl: './add-edit-product.component.html',
  styleUrls: ['./add-edit-product.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditProductComponent implements OnInit {
  addProductToCategoryForm: FormGroup;
  readonly isLoading = signal(false);
  filteredProducts$: Observable<ProductOption[]> = new Observable<ProductOption[]>();
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<AddEditProductComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { categoryProductData: CategoryProductDialogData },
    private fb: FormBuilder,
    private productService: ProductService,
    private categoryService: CategoryService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const { productCategoryId, productId, fromDate, thruDate } = this.data?.categoryProductData ?? {};

    this.addProductToCategoryForm = this.fb.group({
      productCategoryId: [productCategoryId],
      productId: [productId, Validators.required],
      fromDate: [fromDate],
      thruDate: [thruDate],
    });
  }

  ngOnInit(): void {
    this.filteredProducts$ = this.addProductToCategoryForm.get('productId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => this.getProductsFromService(value ?? ''))
    );
  }

  displayProduct(product: ProductOption | string | null): string {
    if (!product) {
      return '';
    }
    if (typeof product === 'string') {
      return product;
    }
    return product.productName || product.name || product.internalName || product.productId || '';
  }

  private getProductsFromService(value: ProductOption | string): Observable<ProductOption[]> {
    const query = typeof value === 'string' ? value : value?.productId ?? '';
    return this.productService.getProductsAutocompleteFromOms(query).pipe(
      map((response: { documentList?: ProductOption[] }) => response.documentList || [])
    );
  }

  addProductToCategory(): void {
    if (!this.addProductToCategoryForm.valid) {
      this.addProductToCategoryForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const values = this.addProductToCategoryForm.value;
    const payload = {
      ...values,
      productId: values?.productId?.productId ?? values?.productId,
    };

    this.categoryService
      .addProductToCategory(payload)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.addProductToCategoryForm.reset();
          this.dialogRef.close({ productCategoryId: values.productCategoryId, refresh: true });
          this.snackbarService.showSuccess(this.translate.instant('CATEGORY.PRODUCT_ADDED_SUCCESS'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('CATEGORY.PRODUCT_ADDED_ERROR'));
        },
      });
  }

}
