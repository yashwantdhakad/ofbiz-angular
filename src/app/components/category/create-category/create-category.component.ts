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
import { CategoryService } from '@ofbiz/services/category/category.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

interface CategoryType {
  productCategoryTypeId: string;
  description?: string;
}

@Component({
  standalone: false,
  selector: 'app-create-category',
  templateUrl: './create-category.component.html',
  styleUrls: ['./create-category.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCategoryComponent implements OnInit {
  isLoading = signal<boolean>(false);
  categoryForm: FormGroup;
  categoryTypes = signal<CategoryType[]>([]);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private categoryService: CategoryService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      productCategoryTypeId: ['CATALOG_CATEGORY', Validators.required],
      primaryParentCategoryId: [''],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.getCategoryTypes();
  }

  getCategoryTypes(): void {
    this.isLoading.set(true);
    this.commonService
      .getLookupResults({}, 'product_category_type')
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.categoryTypes.set(Array.isArray(data) ? data : [data]);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('CATEGORY.FETCH_TYPES_ERROR'));
        },
      });
  }

  createCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const values = this.categoryForm.value;

    this.categoryService
      .createCategory(values)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          if (data?.productCategoryId) {
            this.router.navigate([`/category/${data.productCategoryId}`]);
            this.snackbarService.showSuccess(this.translate.instant('CATEGORY.CREATED_SUCCESS'));
            this.categoryForm.reset({ productCategoryTypeId: 'CATALOG_CATEGORY' });
          } else {
            this.snackbarService.showError(this.translate.instant('CATEGORY.FAILED_CREATE'));
          }
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('CATEGORY.ERROR_CREATE'));
        },
      });
  }

  trackByCategoryType = (index: number, categoryType: CategoryType): string =>
    categoryType?.productCategoryTypeId ?? String(index);
}
