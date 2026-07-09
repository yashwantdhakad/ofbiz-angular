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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { TranslateService } from '@ngx-translate/core';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: false,
  selector: 'app-operation-create',
  templateUrl: './operation-create.component.html',
  styleUrls: ['./operation-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationCreateComponent implements OnInit {
  operationForm!: FormGroup;
  facilities: any[] = [];
  operationTypes: Array<{ id: string; label: string }> = [
    { id: 'ROU_ASSEMBLING', label: 'MANUFACTURING.ROU_ASSEMBLING' },
    { id: 'ROU_MANUFACTURING', label: 'MANUFACTURING.ROU_MANUFACTURING' },
    { id: 'ROU_PACKING', label: 'MANUFACTURING.ROU_PACKING' },
  ];

  readonly isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private manufacturingService: ManufacturingService,
    private commonService: CommonService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private preferredFacilityService: PreferredFacilityService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.operationForm = this.fb.group({
      facilityId: ['', Validators.required],
      workEffortName: ['', Validators.required],
      description: [''],
      fixedAssetId: [''],
      workEffortPurposeTypeId: ['ROU_ASSEMBLING'],
      estimatedSetupMillis: [''],
      estimatedMilliSeconds: [''],
      reservPersons: [''],
    });

    this.commonService.getFacilities().subscribe({
      next: (response: any) => {
        this.facilities = this.normalizeFacilities(response);
        this.preferredFacilityService.applyPreferredFacilityIfMissing(
          this.operationForm.get('facilityId'),
          this.facilities
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.FETCH_FACILITIES_ERROR'));
        this.cdr.markForCheck();
      },
    });
  }

  createOperation(): void {
    if (this.operationForm.invalid) {
      this.operationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.operationForm.value;
    const payload = {
      workEffortTypeId: 'ROU_TASK',
      currentStatusId: 'ROU_ACTIVE',
      workEffortName: formValue.workEffortName?.trim(),
      description: formValue.description?.trim() || null,
      facilityId: formValue.facilityId || null,
      fixedAssetId: formValue.fixedAssetId?.trim() || null,
      workEffortPurposeTypeId: formValue.workEffortPurposeTypeId || 'ROU_ASSEMBLING',
      estimatedSetupMillis: this.normalizeNumericText(formValue.estimatedSetupMillis),
      estimatedMilliSeconds: this.normalizeNumericText(formValue.estimatedMilliSeconds),
      reservPersons: this.normalizeNumericText(formValue.reservPersons),
      quantityToProduce: '0.000000',
      revisionNumber: '1',
    };

    this.manufacturingService.createWorkEffort(payload).subscribe({
      next: (response: any) => {
        this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.CREATE_OPERATION_SUCCESS'));

        const workEffortId = response?.workEffortId;
        if (workEffortId) {
          this.router.navigate(['/operations', workEffortId]);
        } else {
          this.router.navigate(['/operations']);
        }
      },
      error: (error) => {
        console.error('Error creating operation:', error);
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.CREATE_OPERATION_ERROR'));
        this.isSubmitting.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/operations']);
  }

  private normalizeFacilities(response: any): any[] {
    const facilities = [
      response,
      response?.data,
      response?.data?.resultList,
      response?.data?.documentList,
      response?.resultList,
      response?.documentList,
      response?.facilities,
    ].find((candidate) => Array.isArray(candidate)) ?? [];

    return facilities
      .filter((facility: any) => !!facility?.facilityId)
      .map((facility: any) => ({
        ...facility,
        label: facility?.label || facility?.facilityName || facility?.facilityId,
      }));
  }

  private normalizeNumericText(value: any): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value).trim();
  }
}
