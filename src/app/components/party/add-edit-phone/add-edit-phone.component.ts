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
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { finalize } from 'rxjs/operators';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { SharedPartyMaterialModule } from '../../common/material/shared-party-material.module';

@Component({
  standalone: true,
  selector: 'app-add-edit-phone',
  templateUrl: './add-edit-phone.component.html',
  styleUrls: ['./add-edit-phone.component.css'],
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, SharedPartyMaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditPhoneComponent {
  addEditPhoneForm: FormGroup;
  readonly isLoading = signal(false);
  phonePattern: string = '^[0-9]{10}$';

  constructor(
    private partyService: PartyService,
    public dialogRef: MatDialogRef<AddEditPhoneComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { addEditPhoneData: any },
    private fb: FormBuilder,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const addEditPhoneData = data?.addEditPhoneData || {};
    const contactNumber = addEditPhoneData.contactNumber || '';

    this.addEditPhoneForm = this.fb.group({
      partyId: [addEditPhoneData.partyId || null],
      contactMechId: [addEditPhoneData.contactMechId],
      contactMechPurposeId: [
        addEditPhoneData.contactMechPurposeId || 'PRIMARY_PHONE',
      ],
      contactNumber: [
        contactNumber,
        [Validators.required, Validators.pattern(this.phonePattern)],
      ],
      areaCode: [addEditPhoneData.areaCode || ''],
      countryCode: [addEditPhoneData.countryCode || ''],
    });
  }

  addEditPhone(): void {
    if (this.addEditPhoneForm.valid) {
      this.isLoading.set(true);
      const values = this.addEditPhoneForm.value;

      const request$ = values.contactMechId
        ? this.partyService.updatePhoneNumber(values)
        : this.partyService.addPhone(values);

      request$
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('PARTY.PHONE_SAVE_SUCCESS'));
            this.addEditPhoneForm.reset();
            this.dialogRef.close(values);
          },
          error: (_error) => {
            this.snackbarService.showError(this.translate.instant('PARTY.PHONE_SAVE_ERROR'));
          },
        });
    }
  }
}
