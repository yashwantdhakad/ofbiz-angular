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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatSort, Sort } from '@angular/material/sort';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

interface CategorySummary {
  productCategoryId?: string;
  categoryName?: string;
  productCategoryTypeId?: string;
}

interface CategoryTypeOption {
  productCategoryTypeId?: string;
  description?: string;
}

@Component({
  standalone: false,
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent implements OnInit {
  @ViewChild(MatSort) sort?: MatSort;
  isLoading = signal<boolean>(false);
  queryString: string = '';
  searchControl = new FormControl('');
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };
  items = signal<CategorySummary[]>([]);
  pages = signal<number>(0);
  displayedColumns = [
    { key: 'productCategoryId', header: 'COMMON.ID' },
    { key: 'categoryName', header: 'CATEGORY.NAME' },
    { key: 'productCategoryTypeId', header: 'CATEGORY.TYPE' },
  ];
  categoryTypeMap = signal<Map<string, string>>(new Map());
  currentSort?: Sort;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private categoryService: CategoryService,
    private snackbarService: SnackbarService,
    private commonService: CommonService,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadCategoryTypes();
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        map((value) => (value ?? '').toString()),
        debounceTime(300),
        distinctUntilChanged(),
        tap((value) => {
          this.queryString = value;
          this.pagination.page = 1;
        }),
        switchMap((value) =>
          this.categoryService.getCategories(
            0,
            value,
            this.currentSort?.active,
            this.currentSort?.direction
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const list = Array.isArray(response?.resultList) ? response.resultList : [];
          this.renderScheduler.deferMacrotask(() => {
            this.items.set(list);
            this.pages.set(response?.totalCount ?? 0);
          });
        },
        error: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.snackbarService.showError(this.translate.instant('CATEGORY.FETCH_CATEGORIES_ERROR'));
          });
        },
      });

    this.getCategories(1, '');
  }

  onPageChange(pageIndex: number): void {
    const page = pageIndex + 1;
    this.pagination.page = page;
    this.getCategories(page, this.queryString);
  }

  private getCategories(page: number, queryString: string): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });
    this.categoryService.getCategories(page - 1, queryString, this.currentSort?.active, this.currentSort?.direction)
      .subscribe({
        next: (response) => {
          const list = Array.isArray(response?.resultList) ? response.resultList : [];
          this.renderScheduler.deferMacrotask(() => {
            this.items.set(list);
            this.pages.set(response?.totalCount ?? 0);
            this.isLoading.set(false);
          });
        },
        error: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.snackbarService.showError(this.translate.instant('CATEGORY.FETCH_CATEGORIES_ERROR'));
            this.isLoading.set(false);
          });
        },
      });
  }

  onSortChange(sort: Sort): void {
    let direction = sort.direction;
    if (!direction) {
      if (this.currentSort?.active === sort.active) {
        direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        direction = 'asc';
      }
    } else if (this.currentSort?.active === sort.active && this.currentSort.direction === direction) {
      direction = direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { active: sort.active, direction };
    if (this.sort) {
      this.sort.active = sort.active;
      this.sort.direction = direction;
    }
    this.getCategories(this.pagination.page, this.queryString);
  }


  getColumnKeys(): string[] {
    return this.displayedColumns.map(col => col.key);
  }

  getValue(item: CategorySummary, key: string): string | undefined {
    if (key === 'productCategoryTypeId') {
      const typeId = item?.productCategoryTypeId;
      return this.categoryTypeMap().get(typeId ?? '') || typeId;
    }
    const value = (item as Record<string, unknown>)?.[key];
    return typeof value === 'string' ? value : undefined;
  }


  private loadCategoryTypes(): void {
    this.commonService.getLookupResults({}, 'product_category_type').subscribe({
      next: (types: CategoryTypeOption[]) => {
        const list = Array.isArray(types) ? types : [];
        this.renderScheduler.deferMacrotask(() => {
          this.categoryTypeMap.set(new Map(
            list
              .filter((type): type is Required<Pick<CategoryTypeOption, 'productCategoryTypeId'>> & CategoryTypeOption =>
                typeof type.productCategoryTypeId === 'string' && type.productCategoryTypeId.trim().length > 0
              )
              .map((type) => [
                type.productCategoryTypeId,
                type.description || type.productCategoryTypeId,
              ] as [string, string])
          ));
        });
      },
    });
  }

  trackByCategoryColumn = (_: number, column: { key: string }): string => column.key;

  trackByCategoryRow = (_: number, item: CategorySummary): string | number =>
    item?.productCategoryId ?? _;
}
