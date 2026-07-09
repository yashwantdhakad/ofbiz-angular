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
import { ChangeDetectionStrategy, Component, Inject, OnInit, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { SharedPartyMaterialModule } from '@ofbiz/components/common/material/shared-party-material.module';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { OrderService } from '@ofbiz/services/order/order.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ApiService } from '@ofbiz/services/common/api.service';

@Component({
  standalone: true,
  selector: 'app-add-edit-address',
  templateUrl: './add-edit-address.component.html',
  styleUrls: ['./add-edit-address.component.css'],
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, SharedPartyMaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditAddressComponent implements OnInit {
  addEditAddressForm: FormGroup = new FormGroup({});
  readonly isLoading = signal(false);
  states: any[] = [];
  countries: any[] = [];

  constructor(
    private partyService: PartyService,
    private orderService: OrderService,
    public dialogRef: MatDialogRef<AddEditAddressComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { addressData: any },
    private fb: FormBuilder,
    private referenceDataStore: ReferenceDataStore,
    private snackbarService: SnackbarService
  ) {
    effect(() => {
      const providedCountries = this.data?.addressData?.countries || [];
      const providedStates = this.data?.addressData?.states || [];
      this.countries = providedCountries.length ? providedCountries : this.referenceDataStore.countries();
      const allStates = providedStates.length ? providedStates : this.referenceDataStore.states();
      this.states = this.filterStatesByCountry(allStates);
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.referenceDataStore.ensureGeosLoaded();
  }

  initializeForm(): void {
    const address = this.data.addressData;
    const required = Validators.required;
    const defaultPurpose = address.defaultPurpose || address.contactMechPurposeId || 'SHIP_ORIG_LOCATION';

    this.addEditAddressForm = this.fb.group({
      orderId: [address.orderId],
      partyId: [address.partyId],
      contactMechId: [address.contactMechId],
      contactMechPurposeId: [defaultPurpose],
      toName: [address.toName, [required]],
      address1: [address.address1, [required]],
      address2: [address.address2],
      city: [address.city, [required]],
      postalCode: [address.postalCode, [required]],
      countryGeoId: [address.countryGeoId || 'USA', [required]],
      stateProvinceGeoId: [address.stateProvinceGeoId || 'UT', [required]],
    });

    this.addEditAddressForm.get('countryGeoId')?.valueChanges.subscribe((_countryGeoId) => {
      const providedStates = this.data.addressData.states || [];
      const allStates = providedStates.length ? providedStates : this.referenceDataStore.states();
      this.states = this.filterStatesByCountry(allStates);
      this.addEditAddressForm.get('stateProvinceGeoId')?.setValue('');
    });
  }

  filterStatesByCountry(states: any[] = []): any[] {
    if (!Array.isArray(states)) {
      return [];
    }
    const selectedCountry = this.addEditAddressForm.get('countryGeoId')?.value || 'USA';
    return states.filter((state) => {
      const countryId = state.country_geo_id ?? state.countryGeoId;
      return !countryId || countryId === `${selectedCountry}`;
    });
  }

  addEditAddress(): void {
    if (this.addEditAddressForm.invalid) return;

    this.isLoading.set(true);
    const v = this.addEditAddressForm.value;
    const isOrderContext = !!v.orderId;

    const payload = {
      toName: v.toName ?? null,
      address1: v.address1,
      address2: v.address2 ?? null,
      city: v.city,
      postalCode: v.postalCode ?? null,
      countryGeoId: v.countryGeoId ?? null,
      stateProvinceGeoId: v.stateProvinceGeoId ?? null,
      contactMechPurposeId: v.contactMechPurposeId ?? null
    };

    const orderPayload = {
      ...payload,
      contactMechPurposeTypeId: payload.contactMechPurposeId,
    };

    delete (orderPayload as { contactMechPurposeId?: string }).contactMechPurposeId;

    let call$;
    if (isOrderContext) {
      call$ = v.contactMechId
        ? this.orderService.updateOrderAddress(v.orderId, v.contactMechId, orderPayload)
        : this.orderService.addOrderAddress(v.orderId, orderPayload);
    } else {
      call$ = v.contactMechId
        ? this.partyService.updatePostalAddress(v.partyId, v.contactMechId, payload)
        : this.partyService.addPostalAddress(v.partyId, payload);
    }

    call$
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.addEditAddressForm.reset();
          this.dialogRef.close(v);
        },
        error: (err: any) => {
          this.snackbarService.showError(ApiService.extractErrorMessage(err));
        },
      });
  }

}
