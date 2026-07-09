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
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { finalize } from 'rxjs/operators';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: false,
  selector: 'app-add-identification',
  templateUrl: './add-identification.component.html',
  styleUrls: ['./add-identification.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddIdentificationComponent {
  addIdentificationForm: FormGroup;
  enumTypes: any[] | undefined;
  readonly isLoading = signal(false);

  constructor(
    private commonService: CommonService,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    public dialogRef: MatDialogRef<AddIdentificationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { identificationData: any },
    private fb: FormBuilder,
    private translate: TranslateService
  ) {
    const identificationData = data?.identificationData || {};
    const { partyId, partyIdTypeEnumId, idValue } = identificationData;

    this.addIdentificationForm = this.fb.group({
      partyId: [partyId],
      partyIdTypeEnumId: [partyIdTypeEnumId || 'PtidArn', Validators.required],
      idValue: [idValue, Validators.required],
    });

    this.getEnumTypes();
  }

  getEnumTypes(): void {
    this.commonService.getEnumTypes('PartyIdType').subscribe({
      next: (data) => {
        this.enumTypes = Array.isArray(data) ? data : [data];
      },
      error: (_error) => {
      },
    });
  }

  addUpdateIdentification(): void {
    if (!this.addIdentificationForm.valid) return;

    const values = this.addIdentificationForm.value;
    this.isLoading.set(true);

    this.partyService.addIdentification(values).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('PARTY.IDENTIFICATION_SAVE_SUCCESS'));
        this.addIdentificationForm.reset({
          partyIdTypeEnumId: 'PtidArn',
        });
        this.dialogRef.close(values);
      },
      error: (_error) => {
        this.snackbarService.showError(this.translate.instant('PARTY.IDENTIFICATION_SAVE_ERROR'));
      },
    });
  }
}
