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
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-add-order-adjustment-dialog',
  template: `
    <h2 mat-dialog-title>Add Order Adjustment</h2>
    <mat-dialog-content>
      <form [formGroup]="form" fxLayout="column" fxLayoutGap="12px">
        <mat-form-field appearance="outline">
          <mat-label>Adjustment Type</mat-label>
          <mat-select formControlName="orderAdjustmentTypeId">
            <mat-option *ngFor="let t of adjustmentTypes" [value]="t.id">{{ t.label }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('orderAdjustmentTypeId')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <input matInput type="number" formControlName="amount" placeholder="Negative for discounts" />
          <mat-error *ngIf="form.get('amount')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <input matInput formControlName="comments" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()">Add</button>
    </mat-dialog-actions>
  `,
})
export class AddOrderAdjustmentDialogComponent {
  readonly adjustmentTypes = [
    { id: 'SHIPPING_CHARGES', label: 'Shipping Charges' },
    { id: 'DISCOUNT_ADJUSTMENT', label: 'Discount' },
    { id: 'SURCHARGE_ADJUSTMENT', label: 'Surcharge' },
    { id: 'SALES_TAX', label: 'Sales Tax' },
    { id: 'VAT_TAX', label: 'VAT Tax' },
    { id: 'PROMOTION_ADJUSTMENT', label: 'Promotion' },
    { id: 'FEE', label: 'Fee' },
    { id: 'MISCELLANEOUS_CHARGE', label: 'Miscellaneous' },
  ];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddOrderAdjustmentDialogComponent>
  ) {
    this.form = this.fb.group({
      orderAdjustmentTypeId: ['MISCELLANEOUS_CHARGE', Validators.required],
      amount: [null, Validators.required],
      comments: [''],
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.value;
    this.dialogRef.close({
      orderAdjustmentTypeId: val.orderAdjustmentTypeId,
      amount: Number(val.amount),
      comments: val.comments || undefined,
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
