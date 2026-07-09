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
import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-sales-shipment-package-dialog',
  templateUrl: './sales-shipment-package-dialog.component.html',
  styleUrls: ['./sales-shipment-package-dialog.component.css'],
})
export class SalesShipmentPackageDialogComponent {
  packageForm = this.fb.group({
    shipmentBoxTypeId: ['', Validators.required],
    boxLength: [''],
    boxWidth: [''],
    boxHeight: [''],
    weight: ['1', Validators.required],
    boxNo: [''],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly dialogRef: MatDialogRef<SalesShipmentPackageDialogComponent>,
    private readonly fb: FormBuilder
  ) {
    const initialTypeId = data?.defaultBoxTypeId || '';
    this.packageForm.patchValue({
      shipmentBoxTypeId: initialTypeId,
    });
    if (initialTypeId) {
      this.onBoxTypeChange(initialTypeId);
    }
  }

  onBoxTypeChange(shipmentBoxTypeId: string): void {
    const boxType = (this.data?.boxTypes || []).find(
      (item: any) => item?.shipmentBoxTypeId === shipmentBoxTypeId
    );
    if (!boxType) {
      return;
    }
    this.packageForm.patchValue({
      boxLength: boxType.boxLength || '',
      boxWidth: boxType.boxWidth || '',
      boxHeight: boxType.boxHeight || '',
      weight: boxType.boxWeight || this.packageForm.value.weight || '1',
    });
  }

  createPackage(): void {
    if (this.packageForm.invalid) {
      this.packageForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.packageForm.value);
  }

  close(): void {
    this.dialogRef.close();
  }
}
