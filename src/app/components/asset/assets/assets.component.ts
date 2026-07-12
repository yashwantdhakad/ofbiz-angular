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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { map } from 'rxjs/operators';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { DisassemblyDialogComponent } from '../disassembly-dialog/disassembly-dialog.component';

@Component({
  standalone: false,
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  isLoading = signal<boolean>(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly isInspectionRoute = toSignal(
    this.route.url.pipe(map((segments) => segments.some((segment) => segment.path === 'inspection'))),
    { initialValue: this.route.snapshot.routeConfig?.path === 'inspection' }
  );
  queryString: string = '';
  productId: string = '';
  selectedStatusId = '';
  readonly statusOptions = [
    { id: '', label: 'COMMON.ALL' },
    { id: 'INV_AVAILABLE', label: 'ASSET.STATUS_AVAILABLE' },
    { id: 'INV_NS_DEFECTIVE', label: 'ASSET.STATUS_DEFECTIVE' },
    { id: 'INV_NS_ON_HOLD', label: 'ASSET.STATUS_ON_HOLD' },
    { id: 'INV_IN_REPAIR', label: 'ASSET.STATUS_IN_REPAIR' },
    { id: 'INV_DEACTIVATED', label: 'ASSET.STATUS_DEACTIVATED' },
    { id: 'INV_PENDING_INSP', label: 'ASSET.STATUS_PENDING_INSPECTION' },
    { id: 'INV_PROMISED', label: 'ASSET.STATUS_PROMISED' },
    { id: 'INV_BEING_TRANSFERED', label: 'ASSET.STATUS_BEING_TRANSFERRED' },
  ];
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };
  items = signal<any[]>([]);
  pages = signal<number>(0);
  inventoryItemTypeMap = signal<Map<string, string>>(new Map());
  facilities = signal<any[]>([]);
  selectedFacilityId = '';
  hasSearched = signal<boolean>(false);
  isInspectionQueue = signal<boolean>(false);
  selectedAssetIds = signal<Set<string>>(new Set<string>());
  isBulkUpdating = signal<boolean>(false);

  displayedColumns = [
    { key: 'inventoryItemId', header: 'ASSET.ASSET_ID' },
    { key: 'productId', header: 'COMMON.PRODUCT_ID' },
    { key: 'facilityId', header: 'COMMON.FACILITY_ID' },
    { key: 'inventoryItemTypeId', header: 'ASSET.ASSET_TYPE_ENUM_ID' },
    { key: 'statusId', header: 'COMMON.STATUS_ID' },
    { key: 'quantityOnHandTotal', header: 'ASSET.QUANTITY_ON_HAND_TOTAL' },
    { key: 'availableToPromiseTotal', header: 'ASSET.AVAILABLE_TO_PROMISE_TOTAL' },
    { key: 'unitCost', header: 'ASSET.ACQUIRE_COST' },
    { key: 'serialNumber', header: 'ASSET.SERIAL_NUMBER' },
    { key: 'datetimeReceived', header: 'ASSET.RECEIVED_DATE' },
    { key: 'datetimeManufactured', header: 'ASSET.ACQUIRED_DATE' },
    { key: 'expireDate', header: 'ASSET.EXPECTED_END_OF_LIFE' },
    { key: 'actions', header: 'COMMON.ACTIONS' },
  ];
  displayedColumnKeys = this.displayedColumns.map(col => col.key);

  constructor(
    private assetService: AssetService,
    private snackbarService: SnackbarService,
    private route: ActivatedRoute,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService,
    private translate: TranslateService
  ) {
    effect(() => {
      const facilities = this.referenceDataStore.facilities();
      this.facilities.set(facilities);
      if (!this.selectedFacilityId && facilities.length > 0) {
        this.selectedFacilityId = this.preferredFacilityService.resolveInitialFacilityId(facilities);
      }
    });
  }

  ngOnInit(): void {
    const isInspection = this.isInspectionRoute();
    this.isInspectionQueue.set(isInspection);
    if (isInspection) {
      this.displayedColumns = [
        { key: 'select', header: 'COMMON.SELECT' },
        ...this.displayedColumns,
      ];
      this.displayedColumnKeys = this.displayedColumns.map((col) => col.key);
    }
    this.loadLookups();
    this.referenceDataStore.ensureFacilitiesLoaded();
  }

  onSearch(): void {
    if (this.isInspectionQueue() && !this.selectedFacilityId) {
      this.snackbarService.showError(this.translate.instant('ASSET.SELECT_FACILITY_REQUIRED'));
      return;
    }
    this.hasSearched.set(true);
    this.pagination.page = 1;
    this.paginator?.firstPage();
    this.selectedAssetIds.set(new Set());
    this.getAssets(this.pagination.page, this.queryString);
  }

  getAssets(page: number, queryString: string): void {
    this.isLoading.set(true);
    this.assetService.getAssets(
      page - 1,
      queryString,
      this.selectedFacilityId || undefined,
      this.isInspectionQueue() ? 'INV_PENDING_INSP' : (this.selectedStatusId || undefined),
      this.productId.trim() || undefined
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const responseMap = response?.responseMap;
          const list = responseMap?.resultList || [];
          const currentIds = this.selectedAssetIds();
          const updatedIds = new Set<string>(
            Array.from(currentIds).filter(assetId =>
              list.find((item: any) => item?.inventoryItemId === assetId)
            )
          );
          this.items.set(list);
          this.pages.set(responseMap?.total ?? list.length);
          this.selectedAssetIds.set(updatedIds);
          this.isLoading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.pages.set(0);
          this.isLoading.set(false);
          this.snackbarService.showError(this.translate.instant('ASSET.LOAD_ERROR'));
        }
      });
  }

  onFacilityChange(facilityId?: string): void {
    this.selectedFacilityId = facilityId || '';
    this.pagination.page = 1;
    this.hasSearched.set(false);
    this.selectedAssetIds.set(new Set());
    this.items.set([]);
    this.pages.set(0);
  }

  toggleAssetSelection(assetId: string, checked: boolean): void {
    if (!assetId) {
      return;
    }
    this.selectedAssetIds.update(set => {
      const next = new Set(set);
      if (checked) {
        next.add(assetId);
      } else {
        next.delete(assetId);
      }
      return next;
    });
  }

  isSelected(assetId: string): boolean {
    return this.selectedAssetIds().has(assetId);
  }

  isAllSelected(): boolean {
    const items = this.items();
    const ids = this.selectedAssetIds();
    return items.length > 0 && items.every((item) => ids.has(item.inventoryItemId));
  }

  toggleSelectAll(checked: boolean): void {
    const items = this.items();
    if (checked) {
      this.selectedAssetIds.update(() => {
        const next = new Set<string>();
        items.forEach((item) => {
          if (item?.inventoryItemId) {
            next.add(item.inventoryItemId);
          }
        });
        return next;
      });
    } else {
      this.selectedAssetIds.set(new Set());
    }
  }

  runBulkInspection(action: 'ACCEPT' | 'REJECT' | 'REPAIR' | 'DEFECTIVE'): void {
    const inventoryItemIds = Array.from(this.selectedAssetIds());
    if (!inventoryItemIds.length) {
      this.snackbarService.showError(this.translate.instant('ASSET.SELECT_INVENTORY_REQUIRED'));
      return;
    }
    this.isBulkUpdating.set(true);
    this.assetService.bulkInspectionDecision(action, inventoryItemIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const key = `ASSET.INSPECTION_${action}_COMPLETED`;
          this.snackbarService.showSuccess(this.translate.instant(key));
          this.selectedAssetIds.set(new Set());
          this.getAssets(this.pagination.page, this.queryString);
          this.isBulkUpdating.set(false);
        },
        error: () => {
          const key = `ASSET.INSPECTION_${action}_ERROR`;
          this.snackbarService.showError(this.translate.instant(key));
          this.isBulkUpdating.set(false);
        }
      });
  }

  openDisassemblyDialog(item: any): void {
    if (!item?.inventoryItemId) return;
    const dialogRef = this.dialog.open(DisassemblyDialogComponent, {
      width: '640px',
      maxWidth: '96vw',
      data: {
        inventoryItemId: item.inventoryItemId,
        productId: item.productId,
        ownerPartyId: item.ownerPartyId,
      },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.childItemIds?.length) {
          this.getAssets(this.pagination.page, this.queryString);
          const key = result.workflowMode === 'SAME_PRODUCT_REPAIR'
            ? 'ASSET.REFURBISHMENT_COMPLETE'
            : 'ASSET.DISASSEMBLY_COMPLETE';
          this.snackbarService.showSuccess(this.translate.instant(key, {
            count: result.childItemIds.length,
            workEffortId: result.workEffortId || '',
          }));
        }
      });
  }

  onPageChange(pageIndex: number): void {
    if (!this.hasSearched()) {
      return;
    }
    this.pagination.page = pageIndex + 1;
    this.getAssets(this.pagination.page, this.queryString);
  }

  private loadLookups(): void {
    this.assetService.getInventoryItemTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          const list = Array.isArray(types) ? types : [];
          this.inventoryItemTypeMap.set(new Map(
            list.map((type: any) => [
              type.inventoryItemTypeId,
              type.description || type.inventoryItemTypeId,
            ])
          ));
        },
        error: () => {
          this.inventoryItemTypeMap.set(new Map());
        }
      });
  }

  getInventoryItemTypeLabel(typeId?: string): string {
    if (!typeId) {
      return '';
    }
    return this.inventoryItemTypeMap().get(typeId) || typeId;
  }

  getStatusLabel(item: any): string {
    const statusDescription = item?.statusDescription;
    if (statusDescription) {
      return statusDescription;
    }
    const statusId = item?.statusId;
    if (!statusId) {
      return '';
    }
    return this.humanizeCode(String(statusId).trim()) || statusId;
  }

  getFacilityLabel(item: any): string {
    if (!item?.facilityId) {
      return '';
    }
    return item?.facilityName || item?.facilityId;
  }

  private humanizeCode(code?: string): string {
    const normalized = String(code || '').trim();
    if (!normalized) {
      return '';
    }
    return normalized
      .split('_')
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' ');
  }
}
