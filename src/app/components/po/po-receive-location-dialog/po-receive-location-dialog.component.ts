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
import { CommonService } from '@ofbiz/services/common/common.service';

@Component({
  standalone: false,
  selector: 'app-po-receive-location-dialog',
  templateUrl: './po-receive-location-dialog.component.html',
  styleUrls: ['./po-receive-location-dialog.component.css'],
})
export class POReceiveLocationDialogComponent {
  form: FormGroup;
  locationTypes: any[] = [];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private dialogRef: MatDialogRef<POReceiveLocationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      facilityId: [data?.facilityId || '', Validators.required],
      locationSeqId: ['', Validators.required],
      locationTypeEnumId: ['', Validators.required],
      areaId: [''],
      aisleId: [''],
      sectionId: [''],
      levelId: [''],
      positionId: [''],
    });

    this.loadLocationTypes();
  }

  private loadLocationTypes(): void {
    this.commonService.getEnumTypes('FACLOC_TYPE').subscribe({
      next: (data) => {
        this.locationTypes = Array.isArray(data) ? data : [data];
      },
      error: () => {
        this.locationTypes = [];
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.value);
  }

  close(): void {
    this.dialogRef.close();
  }

  trackByLocationType = (index: number, item: any): string => item?.enumId ?? String(index);
}
