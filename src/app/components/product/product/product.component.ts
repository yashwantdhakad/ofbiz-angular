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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSort, Sort } from '@angular/material/sort';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize, map, startWith } from 'rxjs/operators';
import { ProductService } from '@ofbiz/services/product/product.service';
import { CommonService } from '@ofbiz/services/common/common.service';

@Component({
  standalone: false,
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild(MatSort) sort?: MatSort;
  isLoading = signal<boolean>(true);
  queryString = signal('');
  searchControl = new FormControl('');
  pagination = signal({
    page: 1,
    rowsPerPage: 10,
  });
  items = signal<any[]>([]);
  pages = signal<number>(0);
  displayedColumns: string[] = ['productId', 'productName', 'internalName', 'description', 'goodIdentificationValue', 'productTypeId'];
  currentSort = signal<Sort | undefined>(undefined);

  customerColumns = [
    { key: 'productId', header: 'COMMON.PRODUCT_ID' },
    { key: 'productName', header: 'COMMON.NAME' },
    { key: 'internalName', header: 'PRODUCT.INTERNAL_NAME' },
    { key: 'description', header: 'COMMON.DESCRIPTION' },
    { key: 'goodIdentificationValue', header: 'PRODUCT.IDENTIFICATION' },
    { key: 'productTypeId', header: 'COMMON.TYPE' },
  ];
  readonly columnKeys = this.customerColumns.map((col) => col.key);
  productTypeMap = signal<Map<string, string>>(new Map());
  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(''),
      map((value) => (value ?? '').toString()),
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  constructor(
    private productService: ProductService,
    private commonService: CommonService
  ) {
    effect(() => {
      const query = this.searchQuery();
      this.queryString.set(query);
      this.pagination.update((state) => ({ ...state, page: 1 }));
      this.loadProducts(1, query);
    });
  }

  ngOnInit(): void {
    this.loadProductTypes();
  }

  onPageChange(pageIndex: number): void {
    const page = pageIndex + 1;
    this.pagination.update((state) => ({ ...state, page }));
    this.loadProducts(page, this.queryString());
  }

  private loadProducts(page: number, queryString: string): void {
    this.isLoading.set(true);
    this.productService
      .getProducts(page - 1, queryString, this.currentSort()?.active, this.currentSort()?.direction)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data: any) => {
          const list = Array.isArray(data?.documentList) ? data.documentList : [];
          this.applyListUpdate(list, data?.documentListCount ?? 0);
        },
        error: () => {
          this.applyListUpdate([], 0);
        }
      });
  }

  onSortChange(sort: Sort): void {
    let direction = sort.direction;
    if (!direction) {
      if (this.currentSort()?.active === sort.active) {
        direction = this.currentSort()?.direction === 'asc' ? 'desc' : 'asc';
      } else {
        direction = 'asc';
      }
    } else if (this.currentSort()?.active === sort.active && this.currentSort()?.direction === direction) {
      direction = direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort.set({ active: sort.active, direction });
    if (this.sort) {
      this.sort.active = sort.active;
      this.sort.direction = direction;
    }
    this.loadProducts(this.pagination().page, this.queryString());
  }

  getValue(element: any, key: string): any {
    if (key === 'productTypeId') {
      const typeId = element?.productTypeId;
      return this.productTypeMap().get(typeId) || typeId;
    }
    return key.split('.').reduce((acc, part) => acc && acc[part], element);
  }

  private loadProductTypes(): void {
    this.commonService.getLookupResults({}, 'product_type').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (types: any[]) => {
        const list = Array.isArray(types) ? types : [];
        this.productTypeMap.set(new Map(
          list.map((type: any) => [
            type.productTypeId,
            type.description || type.productTypeId,
          ])
        ));
      },
    });
  }

  private applyListUpdate(items: any[], total: number): void {
    this.items.set(items);
    this.pages.set(total);
  }
}
