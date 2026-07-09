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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { FixedAsset, FixedAssetService } from '../../../services/fixed-asset/fixed-asset.service';
import { ReferenceDataStore } from '../../../services/common/reference-data.store';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-fixed-asset-form',
  templateUrl: './fixed-asset-form.component.html',
  styleUrls: ['./fixed-asset-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FixedAssetFormComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isEditMode = signal(false);
  readonly fixedAssetTypes = signal<Array<{ fixedAssetTypeId?: string; description?: string }>>([]);
  readonly statusOptions = computed(() => this.referenceDataStore.statusItemsByType('FIXEDAST_MNT_STATUS'));
  private readonly destroyRef = inject(DestroyRef);
  private assetId = '';
  private originalAssetId = '';

  readonly assetForm = this.fb.group({
    fixedAssetId: ['', Validators.required],
    fixedAssetName: ['', Validators.required],
    fixedAssetTypeId: ['', Validators.required],
    currentStatusId: ['FAM_CREATED', Validators.required],
    parentFixedAssetId: [''],
    instanceOfProductId: [''],
    classEnumId: [''],
    partyId: [''],
    roleTypeId: [''],
    acquireOrderId: [''],
    acquireOrderItemSeqId: [''],
    dateAcquired: [''],
    dateLastServiced: [''],
    dateNextService: [''],
    expectedEndOfLife: [''],
    actualEndOfLife: [''],
    productionCapacity: [null as number | null],
    uomId: [''],
    calendarId: [''],
    serialNumber: [''],
    locatedAtFacilityId: [''],
    locatedAtLocationSeqId: [''],
    purchaseCost: [null as number | null],
    purchaseCostUomId: ['USD'],
    salvageValue: [null as number | null],
    depreciation: [null as number | null],
    quantity: [null as number | null],
    annualFlightHours: [null as number | null],
    oemDiscount: [null as number | null],
    inventoryItemId: [''],
    workEffortId: [''],
    acquireJobId: [''],
    receiptId: [''],
    taAcquisitionSlot: [''],
    reasonEnumId: [''],
    buildCost: [''],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private fixedAssetService: FixedAssetService,
    private referenceDataStore: ReferenceDataStore,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.isEditMode.set(this.route.snapshot.data?.['mode'] === 'edit');
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.assetId = id;
    this.originalAssetId = id;
    this.referenceDataStore.ensureStatusTypeLoaded('FIXEDAST_MNT_STATUS');
    this.loadTypes();

    if (this.isEditMode() && this.assetId) {
      this.loadAsset(this.assetId);
    }
  }

  save(): void {
    if (this.assetForm.invalid || this.isSaving()) {
      this.assetForm.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.isSaving.set(true);
    const request$ = this.isEditMode() && this.assetId
      ? this.fixedAssetService.updateFixedAsset(this.assetId, payload)
      : this.fixedAssetService.createFixedAsset(payload);

    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          const nextId = saved?.id ?? this.assetId ?? this.originalAssetId;
          this.snackbarService.showSuccess(this.translate.instant(this.isEditMode() ? 'FIXED_ASSET.UPDATE_SUCCESS' : 'FIXED_ASSET.CREATE_SUCCESS'));
          if (nextId) {
            this.router.navigate(['/fixed-assets', nextId]);
          } else {
            this.router.navigate(['/fixed-assets']);
          }
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant(this.isEditMode() ? 'FIXED_ASSET.UPDATE_ERROR' : 'FIXED_ASSET.CREATE_ERROR'));
        },
      });
  }

  cancel(): void {
    if (this.isEditMode()) {
      const targetId = this.assetId || this.originalAssetId || this.assetForm.getRawValue().fixedAssetId;
      if (targetId) {
        this.router.navigate(['/fixed-assets', targetId]);
        return;
      }
    }
    this.router.navigate(['/fixed-assets']);
  }

  getTypeLabel(typeId?: string): string {
    if (!typeId) {
      return '';
    }
    return this.fixedAssetTypes().find((item) => item.fixedAssetTypeId === typeId)?.description || typeId;
  }

  getStatusLabel(statusId?: string): string {
    if (!statusId) {
      return '';
    }
    return this.statusOptions().find((item) => item.statusId === statusId)?.description || statusId;
  }

  trackByType(_: number, item: { fixedAssetTypeId?: string }): string {
    return item.fixedAssetTypeId || '';
  }

  trackByStatus(_: number, item: { statusId?: string }): string {
    return item.statusId || '';
  }

  private loadTypes(): void {
    this.fixedAssetService.listFixedAssetTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.fixedAssetTypes.set(Array.isArray(items) ? items : []),
        error: () => this.fixedAssetTypes.set([]),
      });
  }

  private loadAsset(id: string): void {
    this.isLoading.set(true);
    this.fixedAssetService.getFixedAsset(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (asset) => {
          this.assetForm.patchValue({
            fixedAssetId: asset.fixedAssetId || id,
            fixedAssetName: asset.fixedAssetName || '',
            fixedAssetTypeId: asset.fixedAssetTypeId || '',
            currentStatusId: asset.currentStatusId || 'FAM_CREATED',
            parentFixedAssetId: asset.parentFixedAssetId || '',
            instanceOfProductId: asset.instanceOfProductId || '',
            classEnumId: asset.classEnumId || '',
            partyId: asset.partyId || '',
            roleTypeId: asset.roleTypeId || '',
            acquireOrderId: asset.acquireOrderId || '',
            acquireOrderItemSeqId: asset.acquireOrderItemSeqId || '',
            dateAcquired: this.toDateTimeInputValue(asset.dateAcquired),
            dateLastServiced: this.toDateTimeInputValue(asset.dateLastServiced),
            dateNextService: this.toDateTimeInputValue(asset.dateNextService),
            expectedEndOfLife: this.toDateInputValue(asset.expectedEndOfLife),
            actualEndOfLife: this.toDateInputValue(asset.actualEndOfLife),
            productionCapacity: asset.productionCapacity ?? null,
            uomId: asset.uomId || '',
            calendarId: asset.calendarId || '',
            serialNumber: asset.serialNumber || '',
            locatedAtFacilityId: asset.locatedAtFacilityId || '',
            locatedAtLocationSeqId: asset.locatedAtLocationSeqId || '',
            purchaseCost: asset.purchaseCost ?? null,
            purchaseCostUomId: asset.purchaseCostUomId || 'USD',
            salvageValue: asset.salvageValue ?? null,
            depreciation: asset.depreciation ?? null,
            quantity: asset.quantity ?? null,
            annualFlightHours: asset.annualFlightHours ?? null,
            oemDiscount: asset.oemDiscount ?? null,
            inventoryItemId: asset.inventoryItemId || '',
            workEffortId: asset.workEffortId || '',
            acquireJobId: asset.acquireJobId || '',
            receiptId: asset.receiptId || '',
            taAcquisitionSlot: asset.taAcquisitionSlot || '',
            reasonEnumId: asset.reasonEnumId || '',
            buildCost: asset.buildCost || '',
          });
          if (asset.id) {
            this.assetId = String(asset.id);
          }
          if (asset.fixedAssetId) {
            this.originalAssetId = asset.fixedAssetId;
          }
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('FIXED_ASSET.LOAD_ERROR'));
          this.router.navigate(['/fixed-assets']);
        },
      });
  }

  private buildPayload(): FixedAsset {
    const value = this.assetForm.getRawValue();
    return {
      fixedAssetId: this.stringOrUndefined(value.fixedAssetId),
      fixedAssetName: this.stringOrUndefined(value.fixedAssetName),
      fixedAssetTypeId: this.stringOrUndefined(value.fixedAssetTypeId),
      currentStatusId: this.stringOrUndefined(value.currentStatusId),
      parentFixedAssetId: this.stringOrUndefined(value.parentFixedAssetId),
      instanceOfProductId: this.stringOrUndefined(value.instanceOfProductId),
      classEnumId: this.stringOrUndefined(value.classEnumId),
      partyId: this.stringOrUndefined(value.partyId),
      roleTypeId: this.stringOrUndefined(value.roleTypeId),
      acquireOrderId: this.stringOrUndefined(value.acquireOrderId),
      acquireOrderItemSeqId: this.stringOrUndefined(value.acquireOrderItemSeqId),
      dateAcquired: this.stringOrUndefined(value.dateAcquired),
      dateLastServiced: this.stringOrUndefined(value.dateLastServiced),
      dateNextService: this.stringOrUndefined(value.dateNextService),
      expectedEndOfLife: this.stringOrUndefined(value.expectedEndOfLife),
      actualEndOfLife: this.stringOrUndefined(value.actualEndOfLife),
      productionCapacity: value.productionCapacity ?? undefined,
      uomId: this.stringOrUndefined(value.uomId),
      calendarId: this.stringOrUndefined(value.calendarId),
      serialNumber: this.stringOrUndefined(value.serialNumber),
      locatedAtFacilityId: this.stringOrUndefined(value.locatedAtFacilityId),
      locatedAtLocationSeqId: this.stringOrUndefined(value.locatedAtLocationSeqId),
      purchaseCost: value.purchaseCost ?? undefined,
      purchaseCostUomId: this.stringOrUndefined(value.purchaseCostUomId),
      salvageValue: value.salvageValue ?? undefined,
      depreciation: value.depreciation ?? undefined,
      quantity: value.quantity ?? undefined,
      annualFlightHours: value.annualFlightHours ?? undefined,
      oemDiscount: value.oemDiscount ?? undefined,
      inventoryItemId: this.stringOrUndefined(value.inventoryItemId),
      workEffortId: this.stringOrUndefined(value.workEffortId),
      acquireJobId: this.stringOrUndefined(value.acquireJobId),
      receiptId: this.stringOrUndefined(value.receiptId),
      taAcquisitionSlot: this.stringOrUndefined(value.taAcquisitionSlot),
      reasonEnumId: this.stringOrUndefined(value.reasonEnumId),
      buildCost: this.stringOrUndefined(value.buildCost),
    };
  }

  private stringOrUndefined(value: unknown): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }

  private toDateInputValue(value?: string): string {
    return value ? String(value).slice(0, 10) : '';
  }

  private toDateTimeInputValue(value?: string): string {
    return value ? String(value).slice(0, 16) : '';
  }
}
