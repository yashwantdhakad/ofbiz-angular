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
import { finalize } from 'rxjs/operators';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

@Component({
  standalone: false,
  selector: 'app-add-bill-to-customer-dialog',
  templateUrl: './add-bill-to-customer-dialog.component.html',
  styleUrls: ['./add-bill-to-customer-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddBillToCustomerDialogComponent {
  readonly isSaving = signal(false);
  customerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private dialogRef: MatDialogRef<AddBillToCustomerDialogComponent>,
    private translate: TranslateService
  ) {
    this.customerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
    });
  }

  save(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const payload = {
      firstName: this.customerForm.value.firstName?.trim(),
      lastName: this.customerForm.value.lastName?.trim(),
      roleTypeId: 'Customer',
    };

    this.isSaving.set(true);
    this.partyService
      .createCustomer(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (created) => {
          this.snackbarService.showSuccess(this.translate.instant('SO.CUSTOMER_CREATE_SUCCESS'));
          this.dialogRef.close(created);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('SO.CUSTOMER_CREATE_ERROR'));
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
