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
import { Component, Inject, signal, DestroyRef, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

export interface DisassemblyDialogData {
  inventoryItemId: string;
  productId: string;
  ownerPartyId?: string;
}

@Component({
  standalone: false,
  selector: 'app-disassembly-dialog',
  templateUrl: './disassembly-dialog.component.html',
  styleUrls: ['./disassembly-dialog.component.css'],
})
export class DisassemblyDialogComponent {
  readonly isLoading = signal(false);
  readonly jobId = signal<string | null>(null);
  readonly isComplete = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<DisassemblyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DisassemblyDialogData,
    private assetService: AssetService,
    private snackbar: SnackbarService
  ) {}

  executeRepairJob(): void {
    this.isLoading.set(true);
    this.assetService.startRepairJob(this.data.inventoryItemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);
          this.jobId.set(result.jobId ?? result.workEffortId ?? null);
          this.isComplete.set(true);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err?.error?.errorMessage || err?.error?.error || 'Repair job creation failed.';
          this.snackbar.showError(msg);
        }
      });
  }

  close(): void {
    this.dialogRef.close(
      this.isComplete()
        ? { jobId: this.jobId() }
        : null
    );
  }
}
