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
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-product-shipping-config-dialog',
  templateUrl: './product-shipping-config-dialog.component.html',
  styleUrls: ['./product-shipping-config-dialog.component.css'],
})
export class ProductShippingConfigDialogComponent {
  form = this.fb.group({
    shippable: [false],
    inShipBox: [false],
    productHeight: [''],
    productWidth: [''],
    productDepth: [''],
    productWeight: [''],
    shippingHeight: [''],
    shippingWidth: [''],
    shippingDepth: [''],
    shippingWeight: [''],
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductShippingConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form.patchValue({
      shippable: !!data?.config?.shippable,
      inShipBox: !!data?.config?.inShipBox,
      productHeight: this.toInput(data?.config?.productHeight),
      productWidth: this.toInput(data?.config?.productWidth),
      productDepth: this.toInput(data?.config?.productDepth),
      productWeight: this.toInput(data?.config?.productWeight),
      shippingHeight: this.toInput(data?.config?.shippingHeight),
      shippingWidth: this.toInput(data?.config?.shippingWidth),
      shippingDepth: this.toInput(data?.config?.shippingDepth),
      shippingWeight: this.toInput(data?.config?.shippingWeight),
    });
  }

  save(): void {
    const value = this.form.value;
    const payload = {
      shippable: !!value.shippable,
      inShipBox: !!value.inShipBox,
      productHeight: this.toNumberOrNull(value.productHeight),
      productWidth: this.toNumberOrNull(value.productWidth),
      productDepth: this.toNumberOrNull(value.productDepth),
      productWeight: this.toNumberOrNull(value.productWeight),
      shippingHeight: this.toNumberOrNull(value.shippingHeight),
      shippingWidth: this.toNumberOrNull(value.shippingWidth),
      shippingDepth: this.toNumberOrNull(value.shippingDepth),
      shippingWeight: this.toNumberOrNull(value.shippingWeight),
    };
    this.dialogRef.close(payload);
  }

  close(): void {
    this.dialogRef.close();
  }

  private toInput(value: any): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

