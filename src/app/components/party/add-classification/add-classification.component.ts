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
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { CommonService } from '@ofbiz/services/common/common.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

@Component({
  standalone: false,
  selector: 'app-add-classification',
  templateUrl: './add-classification.component.html',
  styleUrls: ['./add-classification.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddClassificationComponent {
  addClassificationForm: FormGroup;
  enumTypes: any[] = [];
  classifications: any[] = [];
  readonly isLoading = signal(false);

  constructor(
    private commonService: CommonService,
    private partyService: PartyService,
    public dialogRef: MatDialogRef<AddClassificationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { classificationData: any },
    private fb: FormBuilder
  ) {
    const { partyId, classificationTypeEnumId, partyClassificationId } =
      data?.classificationData || {};

    this.addClassificationForm = this.fb.group({
      partyId: [partyId],
      classificationTypeEnumId: [classificationTypeEnumId, Validators.required],
      partyClassificationId: [partyClassificationId, Validators.required],
    });

    this.loadEnumTypes();
    this.loadClassifications(this.addClassificationForm.value.classificationTypeEnumId);

    this.addClassificationForm.get('classificationTypeEnumId')?.valueChanges.subscribe((typeId) => {
      this.addClassificationForm.get('partyClassificationId')?.setValue(null);
      this.loadClassifications(typeId);
    });
  }

  private loadClassifications(classificationTypeEnumId?: string): void {
    this.partyService.getClassifications({ classificationTypeEnumId: classificationTypeEnumId || 'PcltCustomer' })
      .subscribe({
        next: (data: any) => {
          this.classifications = Array.isArray(data) ? data : [data];
        },
        error: (_err) => {
        }
      });
  }

  private loadEnumTypes(): void {
    this.commonService.getEnumTypes('PARTY_CLASS_TYPE')
      .subscribe({
        next: (data: any) => {
          this.enumTypes = Array.isArray(data) ? data : [data];
        },
        error: (_err) => {
        }
      });
  }

  addUpdateClassification(): void {
    if (this.addClassificationForm.valid) {
      this.isLoading.set(true);
      const values = this.addClassificationForm.value;

      this.partyService.addClassification(values)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.addClassificationForm.reset({ classificationTypeEnumId: '' });
            this.dialogRef.close(values);
          },
          error: (_err) => {
          }
        });
    }
  }
}
