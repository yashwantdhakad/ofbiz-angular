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
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface TrackingDialogData {
  packageSeqId: string;
  currentTrackingCode: string;
}

@Component({
  standalone: false,
  selector: 'app-sales-shipment-tracking-dialog',
  templateUrl: './sales-shipment-tracking-dialog.component.html',
})
export class SalesShipmentTrackingDialogComponent {
  form: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TrackingDialogData,
    private readonly dialogRef: MatDialogRef<SalesShipmentTrackingDialogComponent>,
    private readonly fb: FormBuilder
  ) {
    this.form = this.fb.group({
      trackingCode: [data?.currentTrackingCode || ''],
    });
  }

  save(): void {
    this.dialogRef.close(this.form.value.trackingCode?.trim() ?? '');
  }

  close(): void {
    this.dialogRef.close();
  }
}
