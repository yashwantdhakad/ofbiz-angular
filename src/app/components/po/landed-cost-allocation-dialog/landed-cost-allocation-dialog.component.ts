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
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface LandedCostDialogData {
  dutyAmount: number;
  clearingFees: number;
  freightAmount: number;
  receivedItemCount: number;
}

@Component({
  standalone: false,
  selector: 'app-landed-cost-allocation-dialog',
  templateUrl: './landed-cost-allocation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandedCostAllocationDialogComponent {
  readonly form = this.fb.group({
    allocationMethod: ['VALUE', Validators.required],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<LandedCostAllocationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: LandedCostDialogData
  ) {}

  get total(): number {
    return Number(this.data.dutyAmount || 0)
      + Number(this.data.clearingFees || 0)
      + Number(this.data.freightAmount || 0);
  }

  allocate(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.getRawValue());
    }
  }
}
