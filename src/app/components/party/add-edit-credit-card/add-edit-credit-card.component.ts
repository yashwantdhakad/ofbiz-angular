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
import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CommonService } from '@ofbiz/services/common/common.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { PostalAddress } from '@ofbiz/models/party.model';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

interface GeoItem {
  geo_id?: string;
  geoId?: string;
  geo_type_id?: string;
  geo_name?: string;
  geoName?: string;
  country_geo_id?: string;
  countryGeoId?: string;
}

interface EnumTypeItem {
  enumId?: string;
  description?: string;
}

interface CreditCardData {
  paymentMethodId?: string;
  partyId?: string;
  cardNumber?: string;
  description?: string;
  postalContactMechId?: string;
  paymentMethodTypeEnumId?: string;
  roleTypeId?: string;
  firstNameOnAccount?: string;
  lastNameOnAccount?: string;
  companyNameOnAccount?: string;
  creditCardTypeEnumId?: string;
  validateSecurityCode?: boolean | string;
  expireMonth?: string | number;
  expireYear?: string | number;
  toName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  postalCode?: string;
  countryGeoId?: string;
  stateProvinceGeoId?: string;
  postalAddressList?: PostalAddress[];
  countries?: GeoItem[];
  states?: GeoItem[];
}

@Component({
  standalone: false,
  selector: 'app-add-edit-credit-card',
  templateUrl: './add-edit-credit-card.component.html',
  styleUrls: ['./add-edit-credit-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditCreditCardComponent implements OnInit {
  addEditCreditCardForm: FormGroup = new FormGroup({});
  readonly isLoading = signal(false);
  states: GeoItem[] = [];
  countries: GeoItem[] = [];
  allStates: GeoItem[] = [];
  enumTypes: EnumTypeItem[] = [];
  existingAddresses: PostalAddress[] = [];
  months: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
  years: number[] = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);

  constructor(
    private commonService: CommonService,
    private partyService: PartyService,
    public dialogRef: MatDialogRef<AddEditCreditCardComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { creditCardData: CreditCardData },
    private fb: FormBuilder,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    const { creditCardData } = this.data;
    this.existingAddresses = Array.isArray(creditCardData.postalAddressList)
      ? creditCardData.postalAddressList
      : [];

    this.initializeForm();
    this.loadGeoOptions();

    this.getEnumerations();
  }

  initializeForm(): void {
    const d = this.data.creditCardData;
    const required = Validators.required;
    const shouldCreateNewAddress = this.existingAddresses.length === 0;
    const defaultAddressId = d.postalContactMechId || this.getDefaultAddressId();

    this.addEditCreditCardForm = this.fb.group({
      partyId: [d.partyId],
      paymentMethodId: [d.paymentMethodId],
      paymentMethodTypeEnumId: [d.paymentMethodTypeEnumId || 'PmtCreditCard'],
      postalContactMechId: [d.postalContactMechId],
      roleTypeId: [d.roleTypeId || 'CUSTOMER'],
      description: [d.description],
      firstNameOnAccount: [d.firstNameOnAccount, [required]],
      lastNameOnAccount: [d.lastNameOnAccount, [required]],
      companyNameOnAccount: [d.companyNameOnAccount],
      creditCardTypeEnumId: [d.creditCardTypeEnumId, [required]], // Removed default 'CctAmericanExpress' to force selection
      cardNumber: [d.cardNumber, [required]],
      validateSecurityCode: [d.validateSecurityCode],
      expireMonth: [d.expireMonth, [required]],
      expireYear: [d.expireYear, [required]],
      toName: [d.toName, [required]],
      address1: [d.address1, [required]],
      address2: [d.address2],
      city: [d.city, [required]],
      postalCode: [d.postalCode, [required]],
      countryGeoId: [d.countryGeoId || 'USA', [required]],
      stateProvinceGeoId: [d.stateProvinceGeoId || 'UT'],
      createNewAddress: [shouldCreateNewAddress],
      existingAddressId: [defaultAddressId],
      copyFromAddressId: [''],
    });

    if (shouldCreateNewAddress) {
      this.addEditCreditCardForm.get('createNewAddress')?.disable({ emitEvent: false });
    }

    this.addEditCreditCardForm.get('countryGeoId')?.valueChanges.subscribe(() => {
      this.states = this.filterStatesByCountry(this.allStates);
      this.addEditCreditCardForm.get('stateProvinceGeoId')?.setValue('');
    });

    this.addEditCreditCardForm.get('createNewAddress')?.valueChanges.subscribe((useNewAddress) => {
      if (useNewAddress) {
        this.addEditCreditCardForm.get('postalContactMechId')?.setValue('');
        this.applyAddressValidators(true);
        if (!this.addEditCreditCardForm.get('countryGeoId')?.value) {
          this.addEditCreditCardForm.get('countryGeoId')?.setValue('USA');
        }
      } else {
        this.applyAddressValidators(false);
        const selectedId = this.addEditCreditCardForm.get('existingAddressId')?.value;
        this.addEditCreditCardForm.get('postalContactMechId')?.setValue(selectedId || '');
        this.clearAddressFields();
      }
    });

    this.addEditCreditCardForm.get('existingAddressId')?.valueChanges.subscribe((contactMechId) => {
      if (!this.addEditCreditCardForm.get('createNewAddress')?.value) {
        this.addEditCreditCardForm.get('postalContactMechId')?.setValue(contactMechId || '');
      }
    });

    this.addEditCreditCardForm.get('copyFromAddressId')?.valueChanges.subscribe((contactMechId) => {
      if (!contactMechId) return;
      const address = this.findAddressById(contactMechId);
      if (address) {
        this.applyAddressFromExisting(address);
      }
    });

    if (shouldCreateNewAddress) {
      this.applyAddressValidators(true);
    } else {
      this.applyAddressValidators(false);
      this.addEditCreditCardForm.get('postalContactMechId')?.setValue(defaultAddressId || '');
      this.clearAddressFields();
    }
  }

  getEnumerations(): void {
    this.partyService.getEnumerations('CREDIT_CARD_TYPE').subscribe({
      next: (data) => {
        this.enumTypes = Array.isArray(data) ? data : [data];
      },
      error: (_err) => {
        // Handle error if needed
      },
    });
  }

  filterStatesByCountry(states: GeoItem[] = []): GeoItem[] {
    if (!Array.isArray(states)) {
      return [];
    }
    const selectedCountry = this.addEditCreditCardForm.get('countryGeoId')?.value || 'USA';
    return states.filter((state) => {
      const countryId = state.country_geo_id ?? state.countryGeoId;
      if (countryId) {
        return countryId === selectedCountry;
      }
      const geoId = state.geoId ?? '';
      return typeof geoId === 'string' && geoId.startsWith(`${selectedCountry}_`);
    });
  }

  getAddressLabel(address: PostalAddress | null | undefined): string {
    if (!address) return '';
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.stateProvinceGeoId,
      address.postalCode,
      address.countryGeoId,
    ].filter(Boolean);
    return `${parts.join(', ')}`;
  }

  private getDefaultAddressId(): string {
    const primary = this.existingAddresses.find(
      (address) => address?.contactMechPurposeId === 'PRIMARY_LOCATION'
    );
    return (primary || this.existingAddresses[0] || {}).contactMechId || '';
  }

  private findAddressById(contactMechId: string): PostalAddress | undefined {
    return this.existingAddresses.find((address) => address?.contactMechId === contactMechId);
  }

  private applyAddressFromExisting(address: PostalAddress): void {
    this.addEditCreditCardForm.patchValue({
      toName: address.toName || '',
      address1: address.address1 || '',
      address2: address.address2 || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
    });

    if (address.countryGeoId) {
      this.addEditCreditCardForm.get('countryGeoId')?.setValue(address.countryGeoId);
      this.states = this.filterStatesByCountry(this.allStates);
    }

    if (address.stateProvinceGeoId) {
      this.addEditCreditCardForm.get('stateProvinceGeoId')?.setValue(address.stateProvinceGeoId);
    }
  }

  private applyAddressValidators(useNewAddress: boolean): void {
    const required = Validators.required;
    const fields = ['toName', 'address1', 'city', 'postalCode', 'countryGeoId', 'stateProvinceGeoId'];

    fields.forEach((field) => {
      const control = this.addEditCreditCardForm.get(field);
      if (!control) return;
      if (useNewAddress) {
        control.addValidators(required);
      } else {
        control.removeValidators(required);
      }
      control.updateValueAndValidity();
    });
  }

  private clearAddressFields(): void {
    this.addEditCreditCardForm.patchValue({
      toName: '',
      address1: '',
      address2: '',
      city: '',
      postalCode: '',
      countryGeoId: 'USA',
      stateProvinceGeoId: '',
      copyFromAddressId: '',
    });
  }

  private loadGeoOptions(): void {
    const providedCountries = this.data.creditCardData.countries || [];
    const providedStates = this.data.creditCardData.states || [];
    const countries$ = providedCountries.length
      ? of(providedCountries)
      : this.commonService.getLookupResults({ field: 'geo_type_id', value: 'COUNTRY' }, 'geo');
    const states$ = providedStates.length
      ? of(providedStates)
      : this.commonService.getLookupResults({ field: 'geo_type_id', value: 'STATE' }, 'geo');

    forkJoin({ countries: countries$, states: states$ }).subscribe({
      next: ({ countries, states }) => {
        this.countries = countries || [];
        this.allStates = states || [];
        this.states = this.filterStatesByCountry(this.allStates);
      },
    });
  }

  addEditCreditCard(): void {
    if (this.addEditCreditCardForm.valid) {
      this.isLoading.set(true);
      const values = { ...this.addEditCreditCardForm.value };
      const createNewAddress = !!values.createNewAddress;
      const expireMonth = String(values.expireMonth || '').padStart(2, '0');
      const expireYear = values.expireYear ? String(values.expireYear) : '';

      const addressFields = createNewAddress
        ? {
            postalAddressId: null,
            address1: values.address1,
            address2: values.address2,
            city: values.city,
            postalCode: values.postalCode,
            countryGeoId: values.countryGeoId,
            stateProvinceGeoId: values.stateProvinceGeoId,
          }
        : {
            postalAddressId: values.postalContactMechId,
            address1: null,
            address2: null,
            city: null,
            postalCode: null,
            countryGeoId: null,
            stateProvinceGeoId: null,
          };
      const payload = {
        cardType: values.creditCardTypeEnumId,
        cardNumber: values.cardNumber,
        expireDate: expireMonth && expireYear ? `${expireMonth}/${expireYear}` : null,
        firstNameOnCard: values.firstNameOnAccount,
        lastNameOnCard: values.lastNameOnAccount,
        ...addressFields,
        roleTypeId: values.roleTypeId,
      };

      this.partyService.createCreditCard(values.partyId, payload)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('PARTY.CREDIT_CARD_SAVE_SUCCESS'));
            this.addEditCreditCardForm.reset();
            this.dialogRef.close(values);
          },
          error: (_error) => {
            this.snackbarService.showError(this.translate.instant('PARTY.CREDIT_CARD_SAVE_ERROR'));
          },
        });
    }
  }
}
