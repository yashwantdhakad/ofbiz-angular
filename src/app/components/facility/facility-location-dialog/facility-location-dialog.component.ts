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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonService } from '@ofbiz/services/common/common.service';

@Component({
  standalone: false,
  selector: 'app-facility-location-dialog',
  templateUrl: './facility-location-dialog.component.html',
  styleUrls: ['./facility-location-dialog.component.css']
})
export class FacilityLocationDialogComponent {
  form: FormGroup;
  locationTypes: any[] = [];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    public dialogRef: MatDialogRef<FacilityLocationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      facilityId: [data.facilityId, Validators.required],
      locationSeqId: [data.locationSeqId || '', Validators.required],
      locationTypeEnumId: [data.locationTypeEnumId || ''],
      areaId: [data.areaId || ''],
      aisleId: [data.aisleId || ''],
      levelId: [data.levelId || ''],
      positionId: [data.positionId || ''],
      sectionId: [data.sectionId || '']
    });

    this.loadLocationTypes();
  }

  private loadLocationTypes(): void {
    this.commonService.getEnumTypes('FACLOC_TYPE').subscribe({
      next: (data) => {
        this.locationTypes = Array.isArray(data) ? data : [data];
      },
    });
  }

  save(): void {
    if (this.form.valid) {
      const payload = { ...this.form.value };
      if (this.data?.id) {
        payload.id = this.data.id;
      }
      this.dialogRef.close(payload);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  trackByLocationType = (index: number, item: any): string =>
    item?.enumId ?? String(index);
}
