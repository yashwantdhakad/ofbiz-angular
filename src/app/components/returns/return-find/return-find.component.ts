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
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs/operators';
import { ReturnService } from '@ofbiz/services/return/return.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-return-find',
  standalone: false,
  templateUrl: './return-find.component.html',
  styleUrls: ['./return-find.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnFindComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  loading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  rows = signal<any[]>([]);
  totalElements = signal<number>(0);
  statusOptions = signal<Array<{ statusId: string; description: string }>>([]);
  filters = signal({
    returnId: '',
    orderId: '',
    statusId: '',
    orderTypeId: '',
  });
  pagination = signal({
    pageIndex: 0,
    pageSize: 10,
  });
  readonly pageIndex = computed(() => this.pagination().pageIndex);
  readonly pageSize = computed(() => this.pagination().pageSize);
  readonly hasRows = computed(() => this.rows().length > 0);
  readonly showSearchPrompt = computed(() => !this.loading() && !this.hasSearched());
  readonly showEmptyState = computed(() => !this.loading() && this.hasSearched() && !this.hasRows());
  readonly showResultsTable = computed(() => !this.loading() && this.hasRows());
  readonly returnDirectionOptions = [
    { id: '', labelKey: 'COMMON.ALL' },
    { id: 'SALES_ORDER', labelKey: 'RETURN.CUSTOMER_RETURN' },
    { id: 'PURCHASE_ORDER', labelKey: 'RETURN.VENDOR_RETURN' },
  ];

  pageSizeOptions = [10, 20, 50, 100];

  displayedColumns = [
    'returnId',
    'returnType',
    'orderId',
    'status',
    'entryDate',
    'itemCount',
    'totalAmount',
  ];

  constructor(
    private returnService: ReturnService,
    private snackbarService: SnackbarService,
    private commonService: CommonService,
    private translate: TranslateService,
  ) { }

  ngOnInit(): void {
    this.loadStatusOptions();
  }

  private loadStatusOptions(): void {
    this.commonService.getAllStatusItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (items) => {
        const options = Array.isArray(items) ? items : [];
        const unique = new Map<string, string>();
        options.forEach((item: any) => {
          const id = String(item?.statusId || '').trim();
          if (!id || !id.includes('RETURN')) {
            return;
          }
          if (!unique.has(id)) {
            unique.set(id, String(item?.description || id));
          }
        });
        this.statusOptions.set(Array.from(unique.entries())
          .map(([statusId, description]) => ({ statusId, description }))
          .sort((a, b) => a.description.localeCompare(b.description)));
      },
      error: () => {
        this.statusOptions.set([]);
      },
    });
  }

  search(): void {
    const filters = this.filters();
    const pagination = this.pagination();
    this.hasSearched.set(true);
    this.loading.set(true);
    this.returnService.listReturns({
      returnId: filters.returnId.trim() || undefined,
      orderId: filters.orderId.trim() || undefined,
      statusId: filters.statusId.trim() || undefined,
      orderTypeId: filters.orderTypeId.trim() || undefined,
      page: pagination.pageIndex,
      size: pagination.pageSize,
    })
      .pipe(finalize(() => {
        this.loading.set(false);
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data?.content) ? data.content : []);
          this.totalElements.set(Number(data?.totalElements ?? 0));
        },
        error: () => {
          this.rows.set([]);
          this.totalElements.set(0);
          this.snackbarService.showError(this.translate.instant('RETURN.FETCH_LIST_ERROR'));
        },
      });
  }

  clear(): void {
    this.filters.set({
      returnId: '',
      orderId: '',
      statusId: '',
      orderTypeId: '',
    });
    this.pagination.set({
      pageIndex: 0,
      pageSize: 10,
    });
    this.rows.set([]);
    this.totalElements.set(0);
    this.hasSearched.set(false);
  }

  onPageChange(event: PageEvent): void {
    this.pagination.set({
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    });
    this.search();
  }

  onSearchClick(): void {
    this.pagination.update((state) => ({ ...state, pageIndex: 0 }));
    this.search();
  }

  updateFilter(key: 'returnId' | 'orderId' | 'statusId' | 'orderTypeId', value: string): void {
    this.filters.update((state) => ({ ...state, [key]: value }));
  }

  getOrderLink(row: any): string[] | null {
    const orderId = String(row?.orderId || '').trim();
    if (!orderId) {
      return null;
    }
    const orderType = String(row?.orderTypeId || '').toUpperCase();
    return orderType.startsWith('PURCHASE') ? ['/pos', orderId] : ['/orders', orderId];
  }

  trackByStatusOption = (_: number, option: { statusId: string }): string => option.statusId;
  trackByReturnDirectionOption = (_: number, option: { id: string }): string => option.id;
  trackByReturn = (_: number, row: any): string => row.returnId;
}
