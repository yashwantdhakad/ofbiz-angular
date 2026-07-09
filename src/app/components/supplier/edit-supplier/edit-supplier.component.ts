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
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-edit-supplier',
  templateUrl: './edit-supplier.component.html',
  styleUrls: ['./edit-supplier.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditSupplierComponent {
  updateSupplierForm: FormGroup;
  readonly isLoading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<EditSupplierComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { supplierDetail: any },
    private fb: FormBuilder,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const { partyId, groupName } = this.data?.supplierDetail ?? {};

    this.updateSupplierForm = this.fb.group({
      partyId: [partyId],
      groupName: [groupName, Validators.required],
    });
  }

  updateSupplier(): void {
    if (this.updateSupplierForm.invalid) {
      this.updateSupplierForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const values = this.updateSupplierForm.value;

    this.partyService
      .updateSupplier(values)
      .pipe(finalize(() => (this.isLoading.set(false))))
      .subscribe({
        next: () => {
          this.updateSupplierForm.reset();
          this.dialogRef.close(values);
          this.snackbarService.showSuccess(
            this.translate.instant('SUPPLIER.UPDATED_SUCCESS')
          );
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant('SUPPLIER.ERROR_UPDATE')
          );
        },
      });
  }
}
