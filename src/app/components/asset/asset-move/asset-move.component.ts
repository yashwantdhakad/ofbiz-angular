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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { PageEvent } from '@angular/material/paginator';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-asset-move',
  templateUrl: './asset-move.component.html',
  styleUrls: ['./asset-move.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetMoveComponent implements OnInit {
  isLoading = signal<boolean>(false);
  movingInventoryId = signal<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);

  readonly facilities = this.referenceDataStore.facilities;
  selectedFacilityId = '';

  fromLocationControl = new FormControl('');
  productControl = new FormControl('');

  fromLocationOptions$: Observable<any[]> = of([]);
  productOptions$: Observable<any[]> = of([]);

  selectedProductId: string | null = null;

  rows = signal<any[]>([]);
  totalRecords = signal<number>(0);
  pageIndex = 0;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  displayedColumns = [
    'product',
    'fromLocation',
    'inventory',
    'lot',
    'container',
    'quantity',
    'toLocation',
    'moveQty',
    'action',
  ];

  constructor(
    private assetService: AssetService,
    private facilityService: FacilityService,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    private renderScheduler: RenderSchedulerService,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService,
    private translate: TranslateService,
  ) {
    effect(() => {
      const facilities = this.facilities();
      if (!this.selectedFacilityId && facilities.length > 0) {
        this.selectedFacilityId = this.preferredFacilityService.resolveInitialFacilityId(facilities);
      }
    });
  }

  ngOnInit(): void {
    this.loadFacilities();
    this.setupProductAutocomplete();
    this.setupFromLocationAutocomplete();
  }

  private loadFacilities(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
  }

  private setupProductAutocomplete(): void {
    this.productOptions$ = this.productControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((value: any) => {
        const keyword = typeof value === 'string' ? value : value?.productId || '';
        if (typeof value === 'string') {
          this.selectedProductId = null;
        }
        if (!keyword || !keyword.trim()) {
          return of([]);
        }
        return this.productService.getProductsAutocompleteFromOms(keyword.trim()).pipe(
          map((response: any) => {
            const list = Array.isArray(response?.documentList) ? response.documentList : [];
            return list.slice(0, 30);
          })
        );
      })
    );
  }

  private setupFromLocationAutocomplete(): void {
    this.fromLocationOptions$ = this.fromLocationControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((value: any) => {
        if (!this.selectedFacilityId) {
          return of([]);
        }
        const keyword = typeof value === 'string' ? value : value?.locationSeqId || '';
        return this.facilityService
          .getFacilityLocations(this.selectedFacilityId, 0, 30, keyword?.trim() || '')
          .pipe(map((response: any) => (Array.isArray(response?.content) ? response.content : [])));
      })
    );
  }

  displayProduct(option: any): string {
    if (!option) {
      return '';
    }
    if (typeof option === 'string') {
      return option;
    }
    return option.productId || option.productName || '';
  }

  displayLocation(option: any): string {
    if (!option) {
      return '';
    }
    if (typeof option === 'string') {
      return option;
    }
    return option.locationSeqId || '';
  }

  onFacilityChange(facilityId?: string): void {
    this.selectedFacilityId = facilityId || '';
    this.fromLocationControl.setValue('');
    this.productControl.setValue('');
    this.selectedProductId = null;
    this.rows.set([]);
    this.totalRecords.set(0);
    this.pageIndex = 0;
  }

  onProductSelected(event: MatAutocompleteSelectedEvent): void {
    const selected = event.option.value;
    this.selectedProductId = selected?.productId || null;
  }

  onSearch(): void {
    if (!this.selectedFacilityId) {
      this.snackbarService.showError(this.translate.instant('ASSET_MOVE.FACILITY_REQUIRED'));
      return;
    }
    this.pageIndex = 0;
    this.loadRows();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRows();
  }

  loadRows(): void {
    this.isLoading.set(true);
    const fromLocationRaw: any = this.fromLocationControl.value;
    const fromLocation =
      typeof fromLocationRaw === 'object' && fromLocationRaw?.locationSeqId
        ? String(fromLocationRaw.locationSeqId).trim()
        : undefined;

    const productRaw: any = this.productControl.value;
    const productId =
      this.selectedProductId
      || (typeof productRaw === 'object' && productRaw?.productId
        ? String(productRaw.productId).trim()
        : undefined);

    this.assetService
      .searchMoveStocks({
        facilityId: this.selectedFacilityId,
        locationSeqId: fromLocation,
        productId: productId,
        page: this.pageIndex,
        size: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const list = Array.isArray(response?.resultList) ? response.resultList : [];
          this.rows.set(list.map((item: any) => ({
            ...item,
            toLocationInput: '',
            toLocationSeqId: '',
            moveQuantity: String(item?.availableToPromiseTotal ?? ''),
            toLocationOptions: [] as any[],
          })));
          this.totalRecords.set(Number(response?.documentListCount || list.length || 0));
          this.pageIndex = Number(response?.page ?? this.pageIndex);
          this.pageSize = Number(response?.size ?? this.pageSize);
          this.isLoading.set(false);
        },
        error: () => {
          this.rows.set([]);
          this.totalRecords.set(0);
          this.isLoading.set(false);
          this.snackbarService.showError(this.translate.instant('ASSET_MOVE.LOAD_ERROR'));
        },
      });
  }

  onToLocationInput(row: any, value: string): void {
    row.toLocationInput = value;
    row.toLocationSeqId = value;
    row._toLocationReqSeq = (row._toLocationReqSeq || 0) + 1;
    const reqSeq = row._toLocationReqSeq;
    if (!this.selectedFacilityId) {
      row.toLocationOptions = [];
      return;
    }
    this.facilityService
      .getFacilityLocations(this.selectedFacilityId, 0, 20, value || '')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const options = Array.isArray(response?.content) ? response.content : [];
          if (reqSeq !== row._toLocationReqSeq) {
            return;
          }
          this.renderScheduler.deferMacrotask(() => {
            row.toLocationOptions = options;
          });
        },
        error: () => {
          if (reqSeq !== row._toLocationReqSeq) {
            return;
          }
          this.renderScheduler.deferMacrotask(() => {
            row.toLocationOptions = [];
          });
        },
      });
  }

  onToLocationSelected(row: any, option: any): void {
    row.toLocationSeqId = option?.locationSeqId || '';
    row.toLocationInput = row.toLocationSeqId;
  }

  moveRow(row: any): void {
    const moveQty = String(row?.moveQuantity || '').trim();
    const toLocationSeqId = String(row?.toLocationSeqId || row?.toLocationInput || '').trim();

    if (!toLocationSeqId) {
      this.snackbarService.showError(this.translate.instant('ASSET_MOVE.TO_LOCATION_REQUIRED'));
      return;
    }
    if (!moveQty || Number(moveQty) <= 0) {
      this.snackbarService.showError(this.translate.instant('ASSET_MOVE.MOVE_QTY_REQUIRED'));
      return;
    }

    this.movingInventoryId.set(row.inventoryItemId);
    this.assetService
      .moveStock({
        inventoryItemId: row.inventoryItemId,
        toLocationSeqId,
        moveQuantity: moveQty,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('ASSET_MOVE.MOVE_SUCCESS'));
          this.movingInventoryId.set(null);
          this.loadRows();
        },
        error: (error) => {
          this.movingInventoryId.set(null);
          this.snackbarService.showError(
            error?.message || this.translate.instant('ASSET_MOVE.MOVE_ERROR')
          );
        },
      });
  }

  trackByFacility = (index: number, facility: any): string =>
    facility?.facilityId ?? String(index);

  trackByOptionId = (index: number, option: any): string =>
    option?.locationSeqId ?? option?.productId ?? String(index);
}
