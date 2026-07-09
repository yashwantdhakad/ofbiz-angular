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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  EditOperationDialogData,
  EditOperationDialogResult,
  FacilityReferenceItem,
} from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: false,
  selector: 'app-edit-operation-dialog',
  templateUrl: './edit-operation-dialog.component.html',
  styleUrls: ['./edit-operation-dialog.component.css'],
})
export class EditOperationDialogComponent {
  form: FormGroup;
  facilities: FacilityReferenceItem[] = [];
  readonly operationTypes = [
    { id: 'ROU_ASSEMBLING', label: 'MANUFACTURING.PURPOSE_ASSEMBLING' },
    { id: 'ROU_MANUFACTURING', label: 'MANUFACTURING.PURPOSE_MANUFACTURING' },
    { id: 'ROU_SUBCONTRACTING', label: 'MANUFACTURING.PURPOSE_SUBCONTRACTING' },
  ];
  readonly statuses = [
    { id: 'ROU_ACTIVE', label: 'COMMON.ACTIVE' },
    { id: 'ROU_INACTIVE', label: 'COMMON.INACTIVE' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditOperationDialogComponent, EditOperationDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: EditOperationDialogData
  ) {
    this.facilities = Array.isArray(data?.facilities) ? data.facilities : [];
    this.form = this.fb.group({
      workEffortName: [data?.operation?.workEffortName || '', Validators.required],
      description: [data?.operation?.description || ''],
      facilityId: [data?.operation?.facilityId || '', Validators.required],
      fixedAssetId: [data?.operation?.fixedAssetId || ''],
      workEffortPurposeTypeId: [data?.operation?.workEffortPurposeTypeId || 'ROU_ASSEMBLING'],
      estimatedSetupMillis: [data?.operation?.estimatedSetupMillis ?? '', Validators.min(0)],
      estimatedMilliSeconds: [data?.operation?.estimatedMilliSeconds ?? '', Validators.min(0)],
      reservPersons: [data?.operation?.reservPersons ?? '', Validators.min(0)],
      currentStatusId: [data?.operation?.currentStatusId || 'ROU_ACTIVE'],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const result: EditOperationDialogResult = {
      workEffortName: this.form.value.workEffortName,
      description: this.form.value.description,
      facilityId: this.form.value.facilityId,
      fixedAssetId: this.form.value.fixedAssetId,
      workEffortPurposeTypeId: this.form.value.workEffortPurposeTypeId,
      estimatedSetupMillis: this.form.value.estimatedSetupMillis,
      estimatedMilliSeconds: this.form.value.estimatedMilliSeconds,
      reservPersons: this.form.value.reservPersons,
      currentStatusId: this.form.value.currentStatusId,
    };
    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close();
  }
}
