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
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, map, startWith, switchMap } from 'rxjs/operators';

interface CategoryOption {
  productCategoryId: string;
  categoryName?: string;
}

interface ProductCategoryDialogData {
  productId?: string;
}
import { CategoryService } from '@ofbiz/services/category/category.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-add-edit-product-category',
  templateUrl: './add-edit-product-category.component.html',
  styleUrls: ['./add-edit-product-category.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditProductCategoryComponent implements OnInit {
  addProductCategoryForm: FormGroup;

  readonly isLoading = signal(false);
  cachedCategories: CategoryOption[] = [];
  private readonly destroyRef = inject(DestroyRef);

  filteredCategories$: Observable<CategoryOption[]> = new Observable<CategoryOption[]>();
  get productCategoryIdControl(): FormControl {
    return this.addProductCategoryForm.get('productCategoryId') as FormControl;
  }


  constructor(
    public dialogRef: MatDialogRef<AddEditProductCategoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { productCategoryData: ProductCategoryDialogData },
    private fb: FormBuilder,
    private productService: ProductService,
    private categoryService: CategoryService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const { productId } = this.data?.productCategoryData ?? {};

    this.addProductCategoryForm = this.fb.group({
      productId: [productId],
      productCategoryId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.filteredCategories$ = this.productCategoryIdControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => this.getCategoriesFromService(value))
    );
  }

  private getCategoriesFromService(value: string): Observable<CategoryOption[]> {
    return this.categoryService.getCategories(0, value).pipe(
      map((response: { resultList?: CategoryOption[], body?: CategoryOption[] }) => {
        const list = response.resultList ?? response.body ?? [];
        this.cachedCategories = list;
        return list;
      })
    );
  }

  addProductCategory(): void {
    if (this.addProductCategoryForm.valid) {
      this.isLoading.set(true);
      const values = this.addProductCategoryForm.value;

      this.productService
        .addProductCategory(values)
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('PRODUCT.CATEGORY_ADDED_SUCCESS'));
            this.addProductCategoryForm.reset();
            this.dialogRef.close(values);
          },
          error: () => {
            this.snackbarService.showError(this.translate.instant('PRODUCT.CATEGORY_ADDED_ERROR'));
          },
        });
    }
  }

  displayCategoryFn = (categoryId: string): string => {
    const match = this.cachedCategories.find(
      (c) => c.productCategoryId === categoryId
    );
    return match ? (match.categoryName ?? categoryId) : categoryId;
  };


}
