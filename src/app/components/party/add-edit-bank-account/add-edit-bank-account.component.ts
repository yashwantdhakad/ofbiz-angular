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
import { finalize } from 'rxjs/operators';
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

interface BankAccountData {
  paymentMethodId?: string;
  partyId?: string;
  postalContactMechId?: string;
  roleTypeId?: string;
  description?: string;
  firstNameOnAccount?: string;
  lastNameOnAccount?: string;
  companyNameOnAccount?: string;
  routingNumber?: string;
  bankName?: string;
  accountNumber?: string;
  toName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  postalCode?: string;
  countryGeoId?: string;
  stateProvinceGeoId?: string;
  paymentMethodTypeEnumId?: string;
  postalAddressList?: PostalAddress[];
  countries?: GeoItem[];
  states?: GeoItem[];
}

@Component({
  standalone: false,
  selector: 'app-add-edit-bank-account',
  templateUrl: './add-edit-bank-account.component.html',
  styleUrls: ['./add-edit-bank-account.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditBankAccountComponent implements OnInit {
  addEditBankAccountForm: FormGroup = new FormGroup({});
  readonly isLoading = signal(false);
  states: GeoItem[] = [];
  countries: GeoItem[] = [];
  allStates: GeoItem[] = [];
  existingAddresses: PostalAddress[] = [];

  constructor(
    private partyService: PartyService,
    public dialogRef: MatDialogRef<AddEditBankAccountComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { bankAccountData: BankAccountData },
    private fb: FormBuilder,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const { bankAccountData } = this.data;
    this.countries = bankAccountData.countries || [];
    this.allStates = bankAccountData.states || [];
    this.existingAddresses = Array.isArray(bankAccountData.postalAddressList)
      ? bankAccountData.postalAddressList
      : [];
    this.initializeForm();
    this.states = this.filterStatesByCountry(this.allStates);
  }

  initializeForm(): void {
    const d = this.data.bankAccountData;
    const required = Validators.required;
    const shouldCreateNewAddress = this.existingAddresses.length === 0;
    const defaultAddressId = d.postalContactMechId || this.getDefaultAddressId();

    this.addEditBankAccountForm = this.fb.group({
      partyId: [d.partyId],
      paymentMethodId: [d.paymentMethodId],
      paymentMethodTypeEnumId: [d.paymentMethodTypeEnumId || 'PmtBankAccount'],
      postalContactMechId: [d.postalContactMechId],
      roleTypeId: [d.roleTypeId || 'CUSTOMER'],
      description: [d.description],
      firstNameOnAccount: [d.firstNameOnAccount, [required]],
      lastNameOnAccount: [d.lastNameOnAccount, [required]],
      companyNameOnAccount: [d.companyNameOnAccount],
      routingNumber: [d.routingNumber],
      bankName: [d.bankName, [required]],
      accountNumber: [d.accountNumber, [required]],
      toName: [d.toName, [required]],
      address1: [d.address1, [required]],
      address2: [d.address2],
      city: [d.city, [required]],
      postalCode: [d.postalCode, [required]],
      countryGeoId: [d.countryGeoId || 'USA', [required]],
      stateProvinceGeoId: [d.stateProvinceGeoId || ''],
      createNewAddress: [shouldCreateNewAddress],
      existingAddressId: [defaultAddressId],
      copyFromAddressId: [''],
    });

    if (shouldCreateNewAddress) {
      this.addEditBankAccountForm.get('createNewAddress')?.disable({ emitEvent: false });
    }

    this.addEditBankAccountForm.get('countryGeoId')?.valueChanges.subscribe(() => {
      this.states = this.filterStatesByCountry(this.allStates);
      this.addEditBankAccountForm.get('stateProvinceGeoId')?.setValue('');
    });

    this.addEditBankAccountForm.get('createNewAddress')?.valueChanges.subscribe((useNewAddress) => {
      if (useNewAddress) {
        this.addEditBankAccountForm.get('postalContactMechId')?.setValue('');
        this.applyAddressValidators(true);
        if (!this.addEditBankAccountForm.get('countryGeoId')?.value) {
          this.addEditBankAccountForm.get('countryGeoId')?.setValue('USA');
        }
      } else {
        this.applyAddressValidators(false);
        const selectedId = this.addEditBankAccountForm.get('existingAddressId')?.value;
        this.applyExistingAddressSelection(selectedId);
      }
    });

    this.addEditBankAccountForm.get('existingAddressId')?.valueChanges.subscribe((contactMechId) => {
      if (!this.addEditBankAccountForm.get('createNewAddress')?.value) {
        this.applyExistingAddressSelection(contactMechId);
      }
    });

    this.addEditBankAccountForm.get('copyFromAddressId')?.valueChanges.subscribe((contactMechId) => {
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
      this.applyExistingAddressSelection(defaultAddressId || '');
    }
  }

  filterStatesByCountry(states: GeoItem[]): GeoItem[] {
    const selectedCountry = this.addEditBankAccountForm.get('countryGeoId')?.value || 'USA';
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
    return parts.join(', ');
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

  private applyExistingAddressSelection(contactMechId: string): void {
    const address = this.findAddressById(contactMechId);
    this.addEditBankAccountForm.get('postalContactMechId')?.setValue(contactMechId || '');
    if (address) {
      this.applyAddressFromExisting(address);
      return;
    }
    this.clearAddressFields();
  }

  private applyAddressFromExisting(address: PostalAddress): void {
    this.addEditBankAccountForm.patchValue({
      toName: address.toName || '',
      address1: address.address1 || '',
      address2: address.address2 || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      countryGeoId: address.countryGeoId || 'USA',
      stateProvinceGeoId: address.stateProvinceGeoId || '',
    });
    this.states = this.filterStatesByCountry(this.allStates);
  }

  private applyAddressValidators(useNewAddress: boolean): void {
    const required = Validators.required;
    const fields = ['toName', 'address1', 'city', 'postalCode', 'countryGeoId', 'stateProvinceGeoId'];

    fields.forEach((field) => {
      const control = this.addEditBankAccountForm.get(field);
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
    this.addEditBankAccountForm.patchValue({
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

  addEditBankAccount(): void {
    if (this.addEditBankAccountForm.valid) {
      this.isLoading.set(true);
      const values = { ...this.addEditBankAccountForm.getRawValue() };
      const createNewAddress = !!values.createNewAddress;
      const addressFields = createNewAddress
        ? {
            postalAddressId: null,
            toName: values.toName,
            address1: values.address1,
            address2: values.address2,
            city: values.city,
            postalCode: values.postalCode,
            countryGeoId: values.countryGeoId,
            stateProvinceGeoId: values.stateProvinceGeoId,
          }
        : {
            postalAddressId: values.postalContactMechId,
            toName: null,
            address1: null,
            address2: null,
            city: null,
            postalCode: null,
            countryGeoId: null,
            stateProvinceGeoId: null,
          };
      const payload = {
        description: values.description,
        firstNameOnAccount: values.firstNameOnAccount,
        lastNameOnAccount: values.lastNameOnAccount,
        companyNameOnAccount: values.companyNameOnAccount,
        routingNumber: values.routingNumber,
        bankName: values.bankName,
        accountNumber: values.accountNumber,
        roleTypeId: values.roleTypeId,
        ...addressFields,
      };

      this.partyService.createBankAccount(values.partyId, payload)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('PARTY.BANK_ACCOUNT_SAVE_SUCCESS'));
            this.addEditBankAccountForm.reset();
            this.dialogRef.close({
              ...payload,
              partyId: values.partyId,
            });
          },
          error: (_error) => {
            this.snackbarService.showError(this.translate.instant('PARTY.BANK_ACCOUNT_SAVE_ERROR'));
          },
        });
    }
  }
}
