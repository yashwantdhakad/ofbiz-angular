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
import { ChangeDetectionStrategy, Component, ViewChild, effect, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSort, Sort } from '@angular/material/sort';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-supplier',
  templateUrl: './supplier.component.html',
  styleUrls: ['./supplier.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierComponent {
  @ViewChild(MatSort) sort?: MatSort;

  isLoading = signal<boolean>(true);
  items = signal<any[]>([]);
  pages = signal<number>(0);

  queryString = signal('');
  statusId = signal('');
  searchControl = new FormControl('');
  pagination = signal({
    page: 1,
    rowsPerPage: 10,
  });
  currentSort = signal<Sort | undefined>(undefined);
  supplierColumns = [
    { key: 'partyId', header: 'COMMON.ID' },
    { key: 'groupName', header: 'COMMON.NAME' },
    { key: 'contactNumber', header: 'COMMON.PHONE' },
    { key: 'emailAddress', header: 'COMMON.EMAIL' },
  ];
  readonly columnKeys = this.supplierColumns.map((col) => col.key);
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
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {
    effect(() => {
      const query = this.searchQuery();
      const status = this.statusId();
      this.queryString.set(query);
      this.pagination.update((state) => ({ ...state, page: 1 }));
      this.loadSuppliers(1, query, status);
    });
  }

  onStatusChange(value: string): void {
    this.statusId.set(value);
  }

  onPageChange(pageIndex: number): void {
    const page = pageIndex + 1;
    this.pagination.update((state) => ({ ...state, page }));
    this.loadSuppliers(page, this.queryString(), this.statusId());
  }

  private loadSuppliers(page: number, queryString: string, status: string = ''): void {
    this.isLoading.set(true);
    this.partyService
      .getSuppliers(page - 1, queryString, this.currentSort()?.active, this.currentSort()?.direction, status || undefined)
      .subscribe({
        next: (response: any) => {
          const { resultList, documentListCount } = response;
          this.items.set(resultList || []);
          this.pages.set(documentListCount || 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.pages.set(0);
          this.snackbarService.showError(this.translate.instant('SUPPLIER.FETCH_LIST_ERROR'));
          this.isLoading.set(false);
        },
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
    this.loadSuppliers(this.pagination().page, this.queryString(), this.statusId());
  }

  getValue(element: any, key: string): any {
    return key.split('.').reduce((acc, part) => acc && acc[part], element);
  }

  trackBySupplierColumn = (_: number, column: { key: string }): string => column.key;

  trackBySupplierRow = (_: number, item: any): any => item?.partyId ?? item?.id ?? _;
}
