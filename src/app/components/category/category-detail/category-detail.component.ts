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
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { AddEditProductComponent } from '../add-edit-product/add-edit-product.component';
import { EditCategoryComponent } from '../edit-category/edit-category.component';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

interface CategoryDetail {
  productCategoryId?: string;
  categoryName?: string;
  productCategoryTypeId?: string;
  description?: string;
  longDescription?: string;
  primaryParentCategoryId?: string;
  parents?: CategoryRelation[];
  children?: CategoryRelation[];
}

interface CategoryRelation {
  relatedProductCategoryId?: string;
  productCategoryId?: string;
  parentProductCategoryId?: string;
  categoryName?: string;
  fromDate?: string;
  thruDate?: string;
}

interface CategoryProduct {
  [key: string]: unknown;
  productId?: string;
  fromDate?: string;
  thruDate?: string;
  sequenceNum?: string | number;
  productCategoryId?: string;
  product?: { productName?: string };
}

interface CategoryTypeOption {
  productCategoryTypeId?: string;
  description?: string;
}

@Component({
  standalone: false,
  selector: 'app-category-detail',
  templateUrl: './category-detail.component.html',
  styleUrls: ['./category-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDetailComponent implements OnInit {
  isLoading = signal<boolean>(false);
  productCategoryId: string | undefined;
  categoryDetail = signal<CategoryDetail | null>(null);
  categoryTypeLabel = signal<string | undefined>(undefined);
  categoryTypeMap = signal<Map<string, string>>(new Map());
  products = signal<CategoryProduct[]>([]);
  parents = signal<CategoryRelation[]>([]);
  children = signal<CategoryRelation[]>([]);
  productColumns = [
    { key: 'productId', header: 'COMMON.ID' },
    { key: 'product.productName', header: 'COMMON.PRODUCT_NAME' },
    { key: 'fromDate', header: 'CATEGORY.FROM_DATE', isDate: true },
    { key: 'sequenceNum', header: 'CATEGORY.SEQUENCE_NO' },
    { key: 'action', header: 'COMMON.ACTION' }
  ];
  categoryProductData: CategoryProduct | null = null;

  getCurrentDateTime(): string {
    return new Date().toString();
  }

  constructor(
    private readonly categoryService: CategoryService,
    private readonly route: ActivatedRoute,
    private dialog: MatDialog,
    private commonService: CommonService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) { }

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.productCategoryId = params['productCategoryId'];
      if (this.productCategoryId) {
        this.isLoading.set(true);
        this.getCategory(this.productCategoryId);
      }
    });
    this.loadCategoryTypes();
  }

  getCategory(productCategoryId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading.set(true);
    }

    this.categoryService.getCategory(productCategoryId).pipe(
      finalize(() => {
        if (showLoader) {
          this.isLoading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        this.categoryDetail.set(response.category);
        this.categoryTypeLabel.set(this.categoryTypeMap().get(response.category?.productCategoryTypeId ?? ''));
        this.products.set(response.products ?? response.productMembers ?? []);
        this.parents.set(response.parents ?? response.category?.parents ?? []);
        this.children.set(response.children ?? response.category?.children ?? []);
      },
      error: () => {
        this.categoryDetail.set(null);
        this.categoryTypeLabel.set(undefined);
        this.products.set([]);
        this.parents.set([]);
        this.children.set([]);
        this.snackbarService.showError(this.translate.instant('CATEGORY.FETCH_PRODUCTS_ERROR'));
      }
    });
  }

  private refreshCategorySilently(productCategoryId?: string): void {
    const id = productCategoryId || this.productCategoryId;
    if (!id) return;
    this.getCategory(id, false);
  }

  addProductToCategoryDialog(params: CategoryProduct | null = null) {
    this.categoryProductData = {
      ...params,
      productCategoryId: this.productCategoryId,
    };

    this.dialog
      .open(AddEditProductComponent, {
        data: { categoryProductData: this.categoryProductData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productCategoryId) {
          this.refreshCategorySilently(result.productCategoryId);
        }
      });
  }

  deleteProductCategoryDialog(params: CategoryProduct): void {
    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('CATEGORY.DELETE_PRODUCT_TITLE'),
        message: this.translate.instant('CATEGORY.DELETE_PRODUCT_MESSAGE'),
      },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result) {
            this.isLoading.set(true);
            this.categoryService.deleteProductCategory(params).pipe(
              finalize(() => this.isLoading.set(false)),
              takeUntilDestroyed(this.destroyRef)
            ).subscribe({
              next: () => {
                this.refreshCategorySilently(params.productCategoryId);
                this.snackbarService.showSuccess(this.translate.instant('CATEGORY.PRODUCT_DELETED_SUCCESS'));
              },
              error: () => {
                this.snackbarService.showError(this.translate.instant('CATEGORY.PRODUCT_DELETED_ERROR'));
              },
            });
          }
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('CATEGORY.DELETE_CONFIRM_ERROR'));
        }
      });
  }

  editCategoryDialog() {
    this.dialog
      .open(EditCategoryComponent, {
        data: { categoryDetail: this.categoryDetail() },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productCategoryId) {
          this.refreshCategorySilently(result.productCategoryId);
        }
      });
  }

  getProductColumnKeys(): string[] {
    return this.productColumns.map(col => col.key);
  }

  private loadCategoryTypes(): void {
    this.commonService.getLookupResults({}, 'product_category_type').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (types: CategoryTypeOption[]) => {
        const list = Array.isArray(types) ? types : [];
        this.categoryTypeMap.set(new Map(
          list
            .filter((type): type is Required<Pick<CategoryTypeOption, 'productCategoryTypeId'>> & CategoryTypeOption =>
              typeof type.productCategoryTypeId === 'string'
            )
            .map((type) => [
              type.productCategoryTypeId,
              type.description || type.productCategoryTypeId,
            ] as [string, string])
        ));
        const typeId = this.categoryDetail()?.productCategoryTypeId;
        if (typeId) {
          this.categoryTypeLabel.set(this.categoryTypeMap().get(typeId));
        }
      },
    });
  }

  getValue(element: CategoryProduct, key: string): string {
    const keys = key.split('.');
    if (!(keys[0] in element)) return '';
    const result = keys.reduce((o: unknown, k: string) => (o != null ? (o as Record<string, unknown>)[k] : undefined), element as unknown);
    return result == null ? '' : String(result);
  }
}
