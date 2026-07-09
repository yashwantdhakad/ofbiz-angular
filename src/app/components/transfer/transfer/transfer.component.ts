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
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
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
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.css'],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferComponent implements OnInit {
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
    rowsPerPage: 20,
  };
  currentSort?: Sort;
  detailBasePath = '/transfers';
  pageTitleKey = 'TRANSFER.LIST_TITLE';

  displayedColumns: { key: string; value: string }[] = [
    { key: 'id', value: 'COMMON.ID' },
    { key: 'orderId', value: 'COMMON.ORDER_ID' },
    { key: 'entryDate', value: 'TRANSFER.ORDER_DATE' },
    { key: 'statusDescription', value: 'COMMON.STATUS' },
    { key: 'facilityName', value: 'TRANSFER.TO_FACILITY' },
  ];
  displayedColumnKeys: string[] = this.displayedColumns.map((c) => c.key);

  private readonly destroyRef = inject(DestroyRef);

  private static readonly TRANSFER_STATUS_IDS = new Set([
    'ORDER_CREATED', 'ORDER_APPROVED', 'ORDER_SHIPPED', 'ORDER_COMPLETED', 'ORDER_CANCELLED',
  ]);

  readonly statusOptions = computed(() => {
    const seen = new Set<string>();
    return this.referenceDataStore
      .allStatuses()
      .filter((item: StatusLookupItem) =>
        TransferComponent.TRANSFER_STATUS_IDS.has(String(item?.statusId || '').toUpperCase())
      )
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
    private preferredFacilityService: PreferredFacilityService
  ) {
    effect(() => {
      if (!this.selectedFacilityId) {
        this.selectedFacilityId = this.preferredFacilityService.resolveInitialFacilityId(
          this.referenceDataStore.facilities()
        );
      }
    });
  }

  ngOnInit(): void {
    this.referenceDataStore.ensureAllStatusesLoaded();
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.isLoading.set(true);
    this.getOrders(1, this.pagination.rowsPerPage);
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
    this.orderService
      .getTransferOrders(
        page - 1,
        this.queryString,
        pageSize,
        this.currentSort?.active,
        this.currentSort?.direction,
        this.currentFilters()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const responseMap = (response as Record<string, unknown>)['responseMap'] as Record<string, unknown> || response as Record<string, unknown>;
          const orderList = (responseMap?.['orderList'] as OrderHeaderSummary[]) || (responseMap?.['resultList'] as OrderHeaderSummary[]) || (responseMap?.['documentList'] as OrderHeaderSummary[]) || [];
          const orderListCount = Number(responseMap?.['orderListCount'] ?? responseMap?.['totalCount'] ?? responseMap?.['documentListCount'] ?? orderList.length);
          this.items.set(
            orderList.map((order: OrderHeaderSummary) => ({
              ...order,
              entryDate: this.datePipe.transform(order.entryDate, 'MMMM d, y'),
            })) as OrderHeaderSummary[]
          );
          this.pages.set(orderListCount);
          this.isLoading.set(false);
        },
        error: () => {
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
    } else if (
      this.currentSort?.active === sort.active &&
      this.currentSort.direction === direction
    ) {
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

  trackByColumn = (_: number, column: { key: string; value: string }): string => column.key;

  trackByRow = (_: number, item: OrderHeaderSummary): string | number => item?.orderId ?? _;

  onPageChange(pageIndex: number, pageSize: number): void {
    this.isLoading.set(true);
    this.getOrders(pageIndex + 1, pageSize);
  }
}
