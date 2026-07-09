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
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-lot-property-dialog',
  templateUrl: './lot-property-dialog.component.html',
  styleUrls: ['./lot-property-dialog.component.css'],
})
export class LotPropertyDialogComponent {
  propertyControl: FormControl;

  constructor(
    private dialogRef: MatDialogRef<LotPropertyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; label: string; value: any; type: string }
  ) {
    const validators = data.type === 'number' ? [Validators.min(0)] : [];
    this.propertyControl = new FormControl(data?.value ?? '', validators);
  }

  onSave(): void {
    if (this.propertyControl.invalid) {
      this.propertyControl.markAsTouched();
      return;
    }
    const val = this.propertyControl.value;
    this.dialogRef.close(val !== null && val !== undefined ? String(val).trim() : null);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
