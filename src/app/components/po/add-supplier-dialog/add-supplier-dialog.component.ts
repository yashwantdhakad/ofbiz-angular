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
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

@Component({
  standalone: false,
  selector: 'app-add-supplier-dialog',
  templateUrl: './add-supplier-dialog.component.html',
  styleUrls: ['./add-supplier-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddSupplierDialogComponent {
  readonly isSaving = signal(false);
  supplierForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private dialogRef: MatDialogRef<AddSupplierDialogComponent>,
    private translate: TranslateService
  ) {
    this.supplierForm = this.fb.group({
      groupName: ['', Validators.required],
      contactNumber: [''],
      emailAddress: ['', Validators.email],
      gstRcmApplicable: [false],
      tdsSection195Percent: [null, [Validators.min(0), Validators.max(100)]],
    });
  }

  save(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }

    const payload = {
      groupName: this.supplierForm.value.groupName?.trim(),
      contactNumber: this.supplierForm.value.contactNumber?.trim() || null,
      emailAddress: this.supplierForm.value.emailAddress?.trim() || null,
      roleTypeId: 'Supplier',
      gstRcmApplicable: this.supplierForm.value.gstRcmApplicable ? 'Y' : 'N',
      tdsSection195Percent: this.supplierForm.value.tdsSection195Percent,
    };

    this.isSaving.set(true);
    this.partyService
      .createSupplier(payload)
      .subscribe({
        next: (created) => {
          this.snackbarService.showSuccess(this.translate.instant('PO.SUPPLIER_CREATE_SUCCESS'));
          this.dialogRef.close(created);
        },
        error: () => {
          this.isSaving.set(false);
          this.snackbarService.showError(this.translate.instant('PO.SUPPLIER_CREATE_ERROR'));
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
