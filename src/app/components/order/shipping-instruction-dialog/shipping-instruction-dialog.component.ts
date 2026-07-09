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
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { SharedPartyMaterialModule } from '../../common/material/shared-party-material.module';

export interface ShippingInstructionDialogData {
  titleKey: string;
  shippingInstructions?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-shipping-instruction-dialog',
  templateUrl: './shipping-instruction-dialog.component.html',
  styleUrls: ['./shipping-instruction-dialog.component.css'],
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, SharedPartyMaterialModule],
})
export class ShippingInstructionDialogComponent {
  form = new FormGroup({
    shippingInstructions: new FormControl(this.data?.shippingInstructions || ''),
  });

  constructor(
    private dialogRef: MatDialogRef<ShippingInstructionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ShippingInstructionDialogData
  ) {}

  save(): void {
    const value = this.form.value.shippingInstructions || '';
    this.dialogRef.close(value);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
