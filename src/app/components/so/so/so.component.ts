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
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { OrderListFilters, OrderService } from '@ofbiz/services/order/order.service';
import { MatSort, Sort } from '@angular/material/sort';
import { ActivatedRoute } from '@angular/router';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

@Component({
  standalone: false,
  selector: 'app-so',
  templateUrl: './so.component.html',
  styleUrls: ['./so.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SOComponent implements OnInit {
  @ViewChild(MatSort) sort?: MatSort;
  isLoading = signal<boolean>(false);
  queryString: string = '';
  selectedStatusId = '';
  selectedProductStoreId = '';
  selectedOrderDatePreset = '';
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };
  items = signal<any[]>([]);
  pages = signal<number>(0);
  currentSort?: Sort;
  displayedColumns: string[] = [
    'id',
    'orderId',
    'customerName',
    'organizationName',
    'entryDate',
    'statusDescription',
    'storeName',
    'grandTotal',
  ];
  orderTypeId = 'SALES_ORDER';
  detailBasePath = '/orders';
  pageTitle = 'SO.TITLE';
  readonly statusOptions = computed(() => {
    const seen = new Set<string>();
    return this.referenceDataStore.allStatuses()
      .filter((item: any) => String(item?.statusId || '').toUpperCase().startsWith('ORDER_'))
      .filter((item: any) => {
        const statusId = String(item?.statusId || '');
        if (!statusId || seen.has(statusId)) {
          return false;
        }
        seen.add(statusId);
        return true;
      });
  });
  readonly productStoreOptions = computed(() => this.referenceDataStore.productStores());
  readonly orderDatePresets = [
    { value: '', label: 'COMMON.ALL_DATES' },
    { value: 'TODAY', label: 'COMMON.TODAY' },
    { value: 'LAST_7_DAYS', label: 'COMMON.LAST_7_DAYS' },
    { value: 'LAST_30_DAYS', label: 'COMMON.LAST_30_DAYS' },
    { value: 'MORE_THAN_30_DAYS', label: 'COMMON.MORE_THAN_30_DAYS' },
  ];

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    readonly referenceDataStore: ReferenceDataStore,
  ) { }

  ngOnInit(): void {
    const queryParams = this.route.snapshot?.queryParams || {};
    if (queryParams['statusId']) {
      this.selectedStatusId = queryParams['statusId'];
    }
    if (queryParams['productStoreId']) {
      this.selectedProductStoreId = queryParams['productStoreId'];
    }
    if (queryParams['orderDatePreset']) {
      this.selectedOrderDatePreset = queryParams['orderDatePreset'];
    }

    const data = { ...(this.route.parent?.snapshot.data || {}), ...(this.route.snapshot.data || {}) };
    this.orderTypeId = data['orderTypeId'] || 'SALES_ORDER';
    this.detailBasePath = data['detailBasePath'] || '/orders';
    this.pageTitle = data['pageTitle'] || 'SO.TITLE';
    if (this.orderTypeId === 'SALES_QUOTE') {
      this.displayedColumns = this.displayedColumns.filter((column) => column !== 'orderId');
    }
    this.referenceDataStore.ensureAllStatusesLoaded();
    this.referenceDataStore.ensureProductStoresLoaded();
    this.isLoading.set(true);
    this.getOrders(1);
  }

  private currentFilters(): OrderListFilters {
    const filters: OrderListFilters = {};
    if (this.selectedStatusId) {
      filters.statusId = this.selectedStatusId;
    }
    if (this.selectedProductStoreId) {
      filters.productStoreId = this.selectedProductStoreId;
    }
    if (this.selectedOrderDatePreset) {
      filters.orderDatePreset = this.selectedOrderDatePreset;
    }
    return filters;
  }

  getOrders(page: number): void {
    this.pagination.page = page;
    this.orderService.getOrdersByType(
      page - 1,
      this.queryString,
      this.orderTypeId,
      this.pagination.rowsPerPage,
      this.currentSort?.active,
      this.currentSort?.direction,
      this.currentFilters()
    ).subscribe({
      next: (response) => {
        const payload = (response as unknown as Record<string, any>)?.['responseMap'] ?? response;
        const orderList = payload?.orderList || payload?.resultList || payload?.documentList || [];
        const orderListCount = payload?.orderListCount ?? payload?.totalCount ?? payload?.documentListCount ?? orderList.length;
        this.items.set(orderList);
        this.pages.set(orderListCount);
        this.isLoading.set(false);
      },
      error: (_error) => {
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.isLoading.set(true);
    this.getOrders(1);
  }

  clearFilters(): void {
    this.queryString = '';
    this.selectedStatusId = '';
    this.selectedProductStoreId = '';
    this.selectedOrderDatePreset = '';
    this.isLoading.set(true);
    this.getOrders(1);
  }

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pagination.rowsPerPage = pageSize;
    this.isLoading.set(true);
    this.getOrders(pageIndex + 1);
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
    this.getOrders(this.pagination.page);
  }

  trackBySoRow = (_: number, item: any): any => item?.id ?? item?.orderId ?? _;
}
