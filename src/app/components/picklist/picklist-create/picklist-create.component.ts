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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '@ofbiz/services/order/order.service';
import { PicklistCreateItemsDialogComponent } from './picklist-create-items-dialog.component';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { FacilityReferenceItem } from '@ofbiz/models/manufacturing.model';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

interface PicklistOrderSummary {
  orderId?: string;
  orderTypeId?: string;
  statusId?: string;
  statusDescription?: string;
  facilityId?: string;
  createdDate?: string;
}

@Component({
  standalone: false,
  selector: 'app-picklist-create',
  templateUrl: './picklist-create.component.html',
  styleUrls: ['./picklist-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicklistCreateComponent implements OnInit {
  readonly isLoading = signal(false);
  picklists: PicklistOrderSummary[] = [];
  allPicklists: PicklistOrderSummary[] = [];
  selection = new SelectionModel<PicklistOrderSummary>(true, []);
  readonly facilities = computed(() => this.referenceDataStore.facilities());
  readonly facilityMap = computed(
    () =>
      new Map(
        this.facilities().map((facility: FacilityReferenceItem) => [
          facility.facilityId,
          facility.facilityName || facility.facilityId,
        ])
      )
  );

  filters = {
    facilityId: '',
    orderTypeId: 'SALES_ORDER',
  };

  readonly orderTypeOptions = [
    { value: 'SALES_ORDER', labelKey: 'ORDER.TYPE_SALES' },
    { value: 'TRANSFER_ORDER', labelKey: 'ORDER.TYPE_TRANSFER' },
  ];

  displayedColumns = [
    'select',
    'orderId',
    'statusId',
    'facilityId',
    'createdDate',
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private orderService: OrderService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService,
    private translate: TranslateService,
    private snackbarService: SnackbarService
  ) {
    effect(() => {
      if (!this.filters.facilityId && this.facilities().length > 0) {
        this.filters = {
          ...this.filters,
          facilityId: this.preferredFacilityService.resolveInitialFacilityId(this.facilities()),
        };
      }
    });
  }

  ngOnInit(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
    const qpOrderType = this.route.snapshot.queryParamMap.get('orderTypeId');
    if (qpOrderType) {
      this.filters = { ...this.filters, orderTypeId: qpOrderType };
    }
    this.loadPicklists();
  }

  loadPicklists(): void {
    this.isLoading.set(true);
    this.cdr.markForCheck();
    this.orderService
      .getPicklistableOrders(this.filters.orderTypeId || undefined)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.allPicklists = Array.isArray(response) ? response : [];
          this.applyFilters();
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.allPicklists = [];
          this.applyFilters();
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  resetFilters(): void {
    this.filters = {
      facilityId: this.preferredFacilityService.resolveInitialFacilityId(this.facilities()),
      orderTypeId: 'SALES_ORDER',
    };
    this.applyFilters();
  }

  getFacilityLabel(facilityId?: string): string {
    if (!facilityId) {
      return '';
    }
    return this.facilityMap().get(facilityId) || facilityId;
  }

  getStatusLabel(item: PicklistOrderSummary): string {
    return item?.statusDescription || item?.statusId || '';
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.picklists);
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.picklists.length;
    return numRows > 0 && numSelected === numRows;
  }

  checkboxLabel(row?: PicklistOrderSummary): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`;
  }

  openOrderItems(orderId: string): void {
    if (!orderId) {
      return;
    }
    this.orderService.getReservedOrderItems(orderId).subscribe({
      next: (response) => {
        const list = Array.isArray(response) ? response : [];
        this.dialog.open(PicklistCreateItemsDialogComponent, {
          width: '700px',
          data: { orderId, items: list },
        });
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('COMMON.ERROR_LOAD'));
      },
    });
  }

  createPicklists(): void {
    const orderIds = this.selection.selected
      .map((item) => item.orderId)
      .filter((orderId): orderId is string => !!orderId);

    if (orderIds.length === 0) {
      return;
    }

    // Derive facilityId: prefer the one from selected orders, fall back to the active filter
    const selectedFacilityId =
      this.selection.selected.find((item) => item.facilityId)?.facilityId ||
      this.filters.facilityId ||
      undefined;

    this.isLoading.set(true);
    this.cdr.markForCheck();
    this.orderService.createBulkPicklist(orderIds, selectedFacilityId)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
          const result = response as unknown as { picklistId?: string };
          if (result?.picklistId) {
            this.snackbarService.showSuccess(this.translate.instant('PICKLIST.CREATED_SUCCESS'));
            this.router.navigate(['/picklists', result.picklistId]);
          } else {
            this.snackbarService.showError(this.translate.instant('PICKLIST.CREATE_ERROR'));
            this.selection.clear();
            this.loadPicklists();
          }
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
          const msg = err?.error?.errorMessage
            || err?.error?.detail
            || err?.error?.message
            || this.translate.instant('PICKLIST.CREATE_ERROR');
          this.snackbarService.showError(msg);
          this.loadPicklists();
        },
      });
  }

  trackByPicklistOrder = (_: number, item: PicklistOrderSummary): string | number =>
    item?.orderId ?? _;

  private applyFilters(): void {
    const { facilityId } = this.filters;
    this.picklists = this.allPicklists.filter((item) => !facilityId || item.facilityId === facilityId);
    this.selection.clear();
    this.cdr.markForCheck();
  }
}
