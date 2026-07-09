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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderListFilters, OrderService } from '@ofbiz/services/order/order.service';
import { DatePipe } from '@angular/common';
import { MatSort, Sort } from '@angular/material/sort';
import { ActivatedRoute } from '@angular/router';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { OrderHeaderSummary, StatusLookupItem } from '@ofbiz/models/order.model';

@Component({
  standalone: false,
  selector: 'app-po',
  templateUrl: './po.component.html',
  styleUrls: ['./po.component.css'],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class POComponent implements OnInit {
  @ViewChild(MatSort) sort?: MatSort;

  isLoading = signal<boolean>(false);
  items = signal<OrderHeaderSummary[]>([]);
  pages = signal<number>(0);

  queryString: string = '';
  selectedStatusId = '';
  selectedFacilityId = '';
  selectedOrderDatePreset = '';
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };
  currentSort?: Sort;
  isQuoteMode = false;
  detailBasePath = '/pos';
  pageTitleKey = 'PO.TITLE';

  displayedColumns: { key: string; value: string }[] = [
    { key: 'id', value: 'COMMON.ID' },
    { key: 'orderId', value: 'COMMON.ORDER_ID' },
    { key: 'organizationName', value: 'PO.BILL_TO' },
    { key: 'vendorOrganizationName', value: 'PO.SHIP_TO' },
    { key: 'entryDate', value: 'PO.ORDER_DATE' },
    { key: 'statusDescription', value: 'COMMON.STATUS' },
    { key: 'facilityName', value: 'COMMON.FACILITY' },
    { key: 'quantityTotal', value: 'PO.QUANTITY' },
    { key: 'grandTotal', value: 'PO.TOTAL' },
  ];
  displayedColumnKeys: string[] = this.displayedColumns.map((c) => c.key);

  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions = computed(() => {
    const seen = new Set<string>();
    return this.referenceDataStore.allStatuses()
      .filter((item: StatusLookupItem) => String(item?.statusId || '').toUpperCase().startsWith('ORDER_'))
      .filter((item: StatusLookupItem) => {
        const statusId = String(item?.statusId || '');
        if (!statusId || seen.has(statusId)) {
          return false;
        }
        seen.add(statusId);
        return true;
      });
  });
  readonly facilityOptions = this.referenceDataStore.facilities;
  readonly orderDatePresets = [
    { value: '', label: 'COMMON.ALL_DATES' },
    { value: 'TODAY', label: 'COMMON.TODAY' },
    { value: 'LAST_7_DAYS', label: 'COMMON.LAST_7_DAYS' },
    { value: 'LAST_30_DAYS', label: 'COMMON.LAST_30_DAYS' },
    { value: 'MORE_THAN_30_DAYS', label: 'COMMON.MORE_THAN_30_DAYS' },
  ];

  constructor(
    private orderService: OrderService,
    private datePipe: DatePipe,
    private route: ActivatedRoute,
    readonly referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService,
  ) {
    effect(() => {
      if (!this.selectedFacilityId) {
        this.selectedFacilityId = this.preferredFacilityService.resolveInitialFacilityId(this.referenceDataStore.facilities());
      }
    });
  }

  ngOnInit(): void {
    const queryParams = this.route.snapshot?.queryParams || {};
    if (queryParams['statusId']) {
      this.selectedStatusId = queryParams['statusId'];
    }
    if (queryParams['facilityId']) {
      this.selectedFacilityId = queryParams['facilityId'];
    }
    if (queryParams['orderDatePreset']) {
      this.selectedOrderDatePreset = queryParams['orderDatePreset'];
    }

    this.referenceDataStore.ensureAllStatusesLoaded();
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.isQuoteMode = !!data['isQuoteMode'];
      this.detailBasePath = this.isQuoteMode ? '/pos/quotes' : '/pos';
      this.pageTitleKey = this.isQuoteMode ? 'PO.QUOTE_TITLE' : 'PO.TITLE';
      this.displayedColumns = this.displayedColumns.map((column) =>
        column.key === 'orderId'
          ? { ...column, value: this.isQuoteMode ? 'QUOTE.ID' : 'COMMON.ORDER_ID' }
          : column
      );
      this.displayedColumnKeys = this.displayedColumns.map((c) => c.key);
      this.isLoading.set(true);
      this.getOrders(1, this.pagination.rowsPerPage);
    });
  }

  private currentFilters(): OrderListFilters {
    const filters: OrderListFilters = {};
    if (this.selectedStatusId) {
      filters.statusId = this.selectedStatusId;
    }
    if (this.selectedFacilityId) {
      filters.facilityId = this.selectedFacilityId;
    }
    if (this.selectedOrderDatePreset) {
      filters.orderDatePreset = this.selectedOrderDatePreset;
    }
    return filters;
  }

  getOrders(page: number, pageSize: number): void {
    this.pagination.page = page;
    this.pagination.rowsPerPage = pageSize;
    const request$ = this.isQuoteMode
      ? this.orderService.getPurchaseQuotes(
        page - 1,
        pageSize,
        this.queryString,
        this.currentSort?.active,
        this.currentSort?.direction,
        this.currentFilters()
      )
      : this.orderService.getPOs(
        page - 1,
        pageSize,
        this.queryString,
        this.currentSort?.active,
        this.currentSort?.direction,
        this.currentFilters()
      );
    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const responseMap = (response as unknown as Record<string, any>)?.['responseMap'] ?? response;
          const orderList = responseMap?.orderList || responseMap?.resultList || responseMap?.documentList || [];
          const orderListCount = responseMap?.orderListCount ?? responseMap?.totalCount ?? responseMap?.documentListCount ?? orderList.length;
          this.items.set((orderList || []).map((order: OrderHeaderSummary) => ({
            ...order,
            entryDate: this.datePipe.transform(order.entryDate, 'MMMM d, y'),
          })));
          this.pages.set(orderListCount || 0);
          this.isLoading.set(false);
        },
        error: (_error) => {
          this.items.set([]);
          this.pages.set(0);
          this.isLoading.set(false);
        },
      });
  }

  onSearch(): void {
    this.isLoading.set(true);
    this.getOrders(1, this.pagination.rowsPerPage);
  }

  clearFilters(): void {
    this.queryString = '';
    this.selectedStatusId = '';
    this.selectedFacilityId = '';
    this.selectedOrderDatePreset = '';
    this.isLoading.set(true);
    this.getOrders(1, this.pagination.rowsPerPage);
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
    this.isLoading.set(true);
    this.getOrders(this.pagination.page, this.pagination.rowsPerPage);
  }

  trackByPoColumn = (_: number, column: { key: string; value: string }): string => column.key;

  trackByPoRow = (_: number, item: OrderHeaderSummary): string | number => item?.orderId ?? _;

  onPageChange(pageIndex: number, pageSize: number): void {
    this.isLoading.set(true);
    this.getOrders(pageIndex + 1, pageSize);
  }
}
