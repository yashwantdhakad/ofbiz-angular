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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

@Component({
  standalone: false,
  selector: 'app-create-customer',
  templateUrl: './create-customer.component.html',
  styleUrls: ['./create-customer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCustomerComponent implements OnInit {
  readonly isLoading = signal(false);
  createCustomerForm: FormGroup;
  readonly selectedCountryGeoId = signal('USA');
  readonly countries = computed(() => this.referenceDataStore.countries());
  readonly filteredStates = computed(() =>
    this.referenceDataStore.statesByCountry(this.selectedCountryGeoId())
  );
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private partyService: PartyService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore
  ) {
    const requiredValidator = Validators.required;

    this.createCustomerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      emailAddress: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.minLength(10)]],
      roleTypeId: ['CUSTOMER'],
      address1: ['', [requiredValidator]],
      address2: [''],
      city: ['', [requiredValidator]],
      postalCode: ['', [requiredValidator]],
      countryGeoId: ['USA', [requiredValidator]],
      stateProvinceGeoId: ['UT', [requiredValidator]],
    });

  }

  ngOnInit(): void {
    this.referenceDataStore.ensureGeosLoaded();
    this.selectedCountryGeoId.set(
      String(this.createCustomerForm.get('countryGeoId')?.value || 'USA')
    );

    this.createCustomerForm.get('countryGeoId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const countryGeoId =
          this.createCustomerForm.get('countryGeoId')?.value || 'USA';
        this.selectedCountryGeoId.set(String(countryGeoId));
        this.createCustomerForm.get('stateProvinceGeoId')?.setValue('');
      });
  }

  createCustomer(): void {
    if (this.createCustomerForm.invalid) {
      this.createCustomerForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const values = this.createCustomerForm.value;
    const payload = {
      ...values,
      toName: `${values.firstName} ${values.lastName}`.trim(),
    };

    this.partyService
      .createCustomer(payload)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const result = data as { partyId?: string };
          if (result?.partyId) {
            this.snackbarService.showSuccess(
              this.translate.instant('CUSTOMER.CREATED_SUCCESS')
            );
            this.router.navigate([`/customers/${result.partyId}`]);
            this.createCustomerForm.reset({
              roleTypeId: 'CUSTOMER',
              countryGeoId: 'USA',
              stateProvinceGeoId: 'UT',
            });
          } else {
            this.snackbarService.showError(
              this.translate.instant('CUSTOMER.FAILED_CREATE')
            );
          }
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant('CUSTOMER.ERROR_CREATE')
          );
        },
      });
  }
}
