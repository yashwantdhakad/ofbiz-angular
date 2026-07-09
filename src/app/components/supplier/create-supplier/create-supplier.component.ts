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
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-create-supplier',
  templateUrl: './create-supplier.component.html',
  styleUrls: ['./create-supplier.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSupplierComponent {
  readonly isLoading = signal(false);
  supplierForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private partyService: PartyService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    this.supplierForm = this.fb.group({
      groupName: ['', Validators.required],
      emailAddress: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.minLength(10)]],
      roleTypeId: ['SUPPLIER'],
    });
  }

  createSupplier(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const values = this.supplierForm.value;

    this.partyService
      .createSupplier(values)
      .pipe(finalize(() => (this.isLoading.set(false))))
      .subscribe({
        next: (data) => {
          const result = data as { partyId?: string };
          if (result?.partyId) {
            this.snackbarService.showSuccess(
              this.translate.instant('SUPPLIER.CREATED_SUCCESS')
            );
            this.router.navigate([`/suppliers/${result.partyId}`]);
            this.supplierForm.reset({ roleTypeId: 'SUPPLIER' });
          } else {
            this.snackbarService.showError(
              this.translate.instant('SUPPLIER.FAILED_CREATE')
            );
          }
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant('SUPPLIER.ERROR_CREATE')
          );
        },
      });
  }
}
