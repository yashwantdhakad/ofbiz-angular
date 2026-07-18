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
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import {
  FixedAsset,
  FixedAssetService,
  FixedAssetTypeLookup,
} from '../../../services/fixed-asset/fixed-asset.service';
import { StatusLookupItem } from '../../../models/order.model';

@Component({
  selector: 'app-fixed-asset-edit-dialog',
  templateUrl: './fixed-asset-edit-dialog.component.html',
  styleUrls: ['./fixed-asset-edit-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FixedAssetEditDialogComponent {
  readonly isSaving = signal(false);

  readonly form = this.fb.group({
    fixedAssetName: [this.data.asset.fixedAssetName || '', Validators.required],
    fixedAssetTypeId: [this.data.asset.fixedAssetTypeId || ''],
    currentStatusId: [this.data.asset.currentStatusId || ''],
    serialNumber: [this.data.asset.serialNumber || ''],
    locatedAtFacilityId: [this.data.asset.locatedAtFacilityId || ''],
    locatedAtLocationSeqId: [this.data.asset.locatedAtLocationSeqId || ''],
    purchaseCost: [this.data.asset.purchaseCost ?? 0],
    purchaseCostUomId: [this.data.asset.purchaseCostUomId || 'USD'],
  });

  constructor(
    private fb: FormBuilder,
    private fixedAssetService: FixedAssetService,
    private dialogRef: MatDialogRef<FixedAssetEditDialogComponent, FixedAsset | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: {
      asset: FixedAsset;
      typeOptions: FixedAssetTypeLookup[];
      statusOptions: StatusLookupItem[];
    },
  ) {}

  save(): void {
    if (this.form.invalid || this.isSaving() || this.data.asset.id === undefined) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    const payload: Partial<FixedAsset> = {
      ...this.data.asset,
      fixedAssetName: raw.fixedAssetName || '',
      fixedAssetTypeId: raw.fixedAssetTypeId || undefined,
      currentStatusId: raw.currentStatusId || undefined,
      serialNumber: raw.serialNumber || undefined,
      locatedAtFacilityId: raw.locatedAtFacilityId || undefined,
      locatedAtLocationSeqId: raw.locatedAtLocationSeqId || undefined,
      purchaseCost: raw.purchaseCost ?? 0,
      purchaseCostUomId: raw.purchaseCostUomId || 'USD',
    };
    this.fixedAssetService.updateFixedAsset(this.data.asset.id, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (saved) => this.dialogRef.close(saved),
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
