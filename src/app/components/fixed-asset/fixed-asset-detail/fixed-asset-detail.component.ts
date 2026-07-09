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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { FixedAsset, FixedAssetService } from '../../../services/fixed-asset/fixed-asset.service';
import { ReferenceDataStore } from '../../../services/common/reference-data.store';
import { MatDialog } from '@angular/material/dialog';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { FixedAssetEditDialogComponent } from '../fixed-asset-edit-dialog/fixed-asset-edit-dialog.component';
import { FixedAssetTypeLookup } from '../../../services/fixed-asset/fixed-asset.service';

@Component({
  selector: 'app-fixed-asset-detail',
  templateUrl: './fixed-asset-detail.component.html',
  styleUrls: ['./fixed-asset-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FixedAssetDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly asset = signal<FixedAsset | null>(null);
  readonly typeMap = signal(new Map<string, string>());
  readonly typeOptions = signal<FixedAssetTypeLookup[]>([]);
  readonly statusOptions = computed(() => this.referenceDataStore.statusItemsByType('FIXEDAST_MNT_STATUS'));
  private readonly destroyRef = inject(DestroyRef);
  private assetId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fixedAssetService: FixedAssetService,
    private referenceDataStore: ReferenceDataStore,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.referenceDataStore.ensureStatusTypeLoaded('FIXEDAST_MNT_STATUS');
    this.loadTypes();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.assetId = params.get('id') || '';
      if (this.assetId) {
        this.loadAsset(this.assetId);
      }
    });
  }

  editAsset(): void {
    const asset = this.asset();
    if (!asset) {
      return;
    }

    this.dialog.open(FixedAssetEditDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        asset,
        typeOptions: this.typeOptions(),
        statusOptions: this.statusOptions(),
      },
    }).afterClosed().subscribe((updated?: FixedAsset) => {
      if (!updated) {
        return;
      }
      this.asset.set(updated);
      this.snackbarService.showSuccess(this.translate.instant('FIXED_ASSET.UPDATE_SUCCESS'));
    });
  }

  deleteAsset(): void {
    if (!this.assetId) {
      return;
    }

    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('FIXED_ASSET.DELETE_TITLE'),
        message: this.translate.instant('FIXED_ASSET.DELETE_CONFIRM'),
      },
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.fixedAssetService.deleteFixedAsset(this.assetId).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('FIXED_ASSET.DELETE_SUCCESS'));
          this.router.navigate(['/fixed-assets']);
        },
        error: () => this.snackbarService.showError(this.translate.instant('FIXED_ASSET.DELETE_ERROR')),
      });
    });
  }

  getTypeLabel(typeId?: string): string {
    if (!typeId) {
      return '-';
    }
    return this.typeMap().get(typeId) || typeId;
  }

  getStatusLabel(statusId?: string): string {
    if (!statusId) {
      return '-';
    }
    return this.statusOptions().find((item) => item.statusId === statusId)?.description || statusId;
  }

  private loadAsset(id: string): void {
    this.isLoading.set(true);
    this.errorKey.set(null);
    this.asset.set(null);

    this.fixedAssetService.getFixedAsset(id)
      .pipe(
        catchError(() => {
          this.errorKey.set('FIXED_ASSET.LOAD_ERROR');
          return of(null);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((asset) => {
        if (asset) {
          this.asset.set(asset);
        }
      });
  }

  private loadTypes(): void {
    this.fixedAssetService.listFixedAssetTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const list = Array.isArray(items) ? items : [];
          this.typeOptions.set(list);
          this.typeMap.set(new Map(list.map((item) => [String(item.fixedAssetTypeId || '').trim(), item.description || item.fixedAssetTypeId || ''])));
        },
        error: () => {
          this.typeOptions.set([]);
          this.typeMap.set(new Map());
        },
      });
  }
}
