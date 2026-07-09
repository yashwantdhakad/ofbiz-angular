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
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AddJobCostPayload } from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: true,
  selector: 'app-add-job-cost-dialog',
  templateUrl: './add-job-cost-dialog.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddJobCostDialogComponent {
  form: FormGroup;

  costTypes = [
    { id: 'LABOR_SETUP', label: 'Labor – Setup' },
    { id: 'LABOR_RUN', label: 'Labor – Running' },
    { id: 'OVERHEAD', label: 'Overhead' },
    { id: 'MISC', label: 'Miscellaneous' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddJobCostDialogComponent>
  ) {
    this.form = this.fb.group({
      costComponentTypeId: ['LABOR_RUN', Validators.required],
      description: [''],
      cost: [null, [Validators.required, Validators.min(0.01)]],
      currencyUomId: ['USD'],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.value;
    const payload: AddJobCostPayload = {
      costComponentTypeId: val.costComponentTypeId,
      description: val.description || undefined,
      cost: Number(val.cost),
      currencyUomId: val.currencyUomId || 'USD',
    };
    this.dialogRef.close(payload);
  }
}
