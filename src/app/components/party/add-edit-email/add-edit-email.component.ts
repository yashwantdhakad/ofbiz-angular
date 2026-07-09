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
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { finalize } from 'rxjs/operators';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: false,
  selector: 'app-add-edit-email',
  templateUrl: './add-edit-email.component.html',
  styleUrls: ['./add-edit-email.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditEmailComponent {
  addEditEmailForm: FormGroup;
  readonly isLoading = signal(false);

  constructor(
    private partyService: PartyService,
    public dialogRef: MatDialogRef<AddEditEmailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { addEditEmailData: any },
    private fb: FormBuilder,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const {
      partyId,
      contactMechId,
      contactMechPurposeId,
      emailAddress,
    } = data?.addEditEmailData || {};

    this.addEditEmailForm = this.fb.group({
      partyId: [partyId],
      contactMechId: [contactMechId],
      contactMechPurposeId: [
        contactMechPurposeId || 'PRIMARY_EMAIL',
      ],
      emailAddress: [emailAddress, [Validators.required, Validators.email]],
    });
  }

  addEditEmail(): void {
    if (this.addEditEmailForm.valid) {
      this.isLoading.set(true);
      const values = this.addEditEmailForm.value;

      this.partyService
        .addEmail(values)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('PARTY.EMAIL_SAVE_SUCCESS'));
            this.addEditEmailForm.reset();
            this.dialogRef.close(values);
          },
          error: (_error) => {
            this.snackbarService.showError(this.translate.instant('PARTY.EMAIL_SAVE_ERROR'));
          },
        });
    }
  }
}
