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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { JobEditDialogData, JobEditDialogResult } from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: false,
  selector: 'app-job-edit-dialog',
  templateUrl: './job-edit-dialog.component.html',
  styleUrls: ['./job-edit-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobEditDialogComponent implements OnInit {
  form: FormGroup;
  facilities: any[] = [];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<JobEditDialogComponent, JobEditDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: JobEditDialogData
  ) {
    const job = data?.job ?? {};
    this.form = this.fb.group({
      workEffortName: [job.workEffortName || '', Validators.required],
      description: [job.description || ''],
      facilityId: [job.facilityId || '', Validators.required],
      estimatedStartDate: [job.estimatedStartDate ? new Date(job.estimatedStartDate) : null],
      quantity: [job.quantityToProduce ?? '', [Validators.required, Validators.min(0.000001)]],
    });
  }

  ngOnInit(): void {
    this.loadFacilities();
  }

  private loadFacilities(): void {
    this.commonService.getFacilities().subscribe({
      next: (data) => {
        this.facilities = Array.isArray(data) ? data : [data];
        this.cdr.markForCheck();
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.FETCH_FACILITIES_ERROR'));
        this.cdr.markForCheck();
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const estimatedStartDate = raw.estimatedStartDate instanceof Date
      ? raw.estimatedStartDate.toISOString()
      : raw.estimatedStartDate || undefined;
    const result: JobEditDialogResult = {
      workEffortName: raw.workEffortName,
      description: raw.description,
      facilityId: raw.facilityId,
      estimatedStartDate,
      quantity: raw.quantity,
    };
    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close();
  }
}
