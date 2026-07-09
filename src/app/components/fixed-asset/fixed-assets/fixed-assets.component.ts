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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';

import { FixedAsset, FixedAssetService } from '../../../services/fixed-asset/fixed-asset.service';
import { ReferenceDataStore } from '../../../services/common/reference-data.store';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  selector: 'app-fixed-assets',
  templateUrl: './fixed-assets.component.html',
  styleUrls: ['./fixed-assets.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FixedAssetsComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly hasSearched = signal(false);
  readonly assets = signal<FixedAsset[]>([]);
  readonly fixedAssetIdFilter = signal('');
  readonly fixedAssetNameFilter = signal('');
  readonly fixedAssetTypeFilter = signal('');
  readonly statusFilter = signal('');
  readonly facilityFilter = signal('');
  readonly fixedAssetTypes = signal<Array<{ fixedAssetTypeId?: string; description?: string }>>([]);
  readonly displayedColumns = ['fixedAssetId', 'fixedAssetName', 'fixedAssetTypeId', 'currentStatusId', 'locatedAtFacilityId', 'purchaseCost', 'serialNumber'];
  readonly statusOptions = computed(() => this.referenceDataStore.statusItemsByType('FIXEDAST_MNT_STATUS'));
  private readonly destroyRef = inject(DestroyRef);
  readonly displayedAssets = computed(() => {
    const idFilter = this.fixedAssetIdFilter().trim().toLowerCase();
    const nameFilter = this.fixedAssetNameFilter().trim().toLowerCase();
    const typeFilter = this.fixedAssetTypeFilter().trim().toLowerCase();
    const statusFilter = this.statusFilter().trim().toLowerCase();
    const facilityFilter = this.facilityFilter().trim().toLowerCase();

    return this.assets().filter((asset) => {
      const matchesId = !idFilter || String(asset.fixedAssetId || '').toLowerCase().includes(idFilter);
      const matchesName = !nameFilter || String(asset.fixedAssetName || '').toLowerCase().includes(nameFilter);
      const matchesType = !typeFilter || String(asset.fixedAssetTypeId || '').toLowerCase().includes(typeFilter);
      const matchesStatus = !statusFilter || String(asset.currentStatusId || '').toLowerCase().includes(statusFilter);
      const matchesFacility = !facilityFilter || String(asset.locatedAtFacilityId || '').toLowerCase().includes(facilityFilter);
      return matchesId && matchesName && matchesType && matchesStatus && matchesFacility;
    });
  });

  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(20);

  readonly pagedAssets = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.displayedAssets().slice(start, start + this.pageSize());
  });

  constructor(
    private fixedAssetService: FixedAssetService,
    private referenceDataStore: ReferenceDataStore,
    private snackbarService: SnackbarService,
    private router: Router,
    private translate: TranslateService,
  ) {
    effect(() => {
      // reset to first page when filters change
      this.displayedAssets();
      this.pageIndex.set(0);
    });
  }

  ngOnInit(): void {
    this.loadLookups();
    this.referenceDataStore.ensureStatusTypeLoaded('FIXEDAST_MNT_STATUS');
  }

  createAsset(): void {
    this.router.navigate(['/fixed-assets/new']);
  }

  openAsset(asset: FixedAsset): void {
    if (!asset.id) {
      return;
    }
    this.router.navigate(['/fixed-assets', asset.id]);
  }

  searchAssets(): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);
    this.fixedAssetService.listFixedAssets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.assets.set(Array.isArray(items) ? items : []);
          this.pageIndex.set(0);
          this.isLoading.set(false);
        },
        error: () => {
          this.assets.set([]);
          this.isLoading.set(false);
          this.snackbarService.showError(this.translate.instant('FIXED_ASSET.LOAD_ERROR'));
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  clearFilters(): void {
    this.fixedAssetIdFilter.set('');
    this.fixedAssetNameFilter.set('');
    this.fixedAssetTypeFilter.set('');
    this.statusFilter.set('');
    this.facilityFilter.set('');
    this.assets.set([]);
    this.hasSearched.set(false);
  }

  trackAsset(_: number, asset: FixedAsset): number {
    return asset.id || 0;
  }

  getTypeLabel(typeId?: string): string {
    if (!typeId) {
      return '-';
    }
    return this.fixedAssetTypes().find((item) => item.fixedAssetTypeId === typeId)?.description || typeId;
  }

  getStatusLabel(statusId?: string): string {
    if (!statusId) {
      return '-';
    }
    return this.statusOptions().find((item) => item.statusId === statusId)?.description || statusId;
  }

  private loadLookups(): void {
    this.fixedAssetService.listFixedAssetTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.fixedAssetTypes.set(Array.isArray(items) ? items : []),
        error: () => this.fixedAssetTypes.set([]),
      });
  }
}
