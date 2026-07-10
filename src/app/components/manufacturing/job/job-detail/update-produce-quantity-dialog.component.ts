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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface UpdateProduceQuantityDialogData {
  productId?: string;
  productName?: string;
  estimatedQuantity?: number | string;
  produced?: number | string;
}

export interface UpdateProduceQuantityDialogResult {
  quantity: number;
}

@Component({
  standalone: false,
  selector: 'app-update-produce-quantity-dialog',
  templateUrl: './update-produce-quantity-dialog.component.html',
  styleUrls: ['./update-produce-quantity-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateProduceQuantityDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UpdateProduceQuantityDialogComponent, UpdateProduceQuantityDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: UpdateProduceQuantityDialogData
  ) {
    const produced = Number(data?.produced) || 0;
    this.form = this.fb.group({
      quantity: [
        data?.estimatedQuantity ?? '',
        [Validators.required, Validators.min(produced > 0 ? produced : 0.000001)],
      ],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ quantity: Number(this.form.value.quantity) });
  }

  close(): void {
    this.dialogRef.close();
  }
}
