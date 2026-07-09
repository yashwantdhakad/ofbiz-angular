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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { AddEditBankAccountComponent } from './add-edit-bank-account.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('AddEditBankAccountComponent', () => {
  let component: AddEditBankAccountComponent;
  let fixture: ComponentFixture<AddEditBankAccountComponent>;
  let partyService: jasmine.SpyObj<PartyService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddEditBankAccountComponent>>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let translateService: jasmine.SpyObj<TranslateService>;

  const dialogData = {
    bankAccountData: {
      partyId: 'PARTY123',
      paymentMethodId: null,
      postalContactMechId: null,
      roleTypeId: 'CUSTOMER',
      description: 'Test Account',
      firstNameOnAccount: 'John',
      lastNameOnAccount: 'Doe',
      companyNameOnAccount: '',
      routingNumber: '111000025',
      bankName: 'Bank of Test',
      accountNumber: '1234567890',
      toName: 'John Doe',
      address1: '123 Test St',
      address2: '',
      city: 'Testville',
      postalCode: '12345',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'USA_CA',
      postalAddressList: [
        {
          contactMechId: 'ADDR1',
          contactMechPurposeId: 'PRIMARY_LOCATION',
          toName: 'John Doe',
          address1: '123 Test St',
          city: 'Testville',
          postalCode: '12345',
          countryGeoId: 'USA',
          stateProvinceGeoId: 'USA_CA'
        }
      ],
      countries: [{ geoId: 'USA', geoName: 'United States' }],
      states: [
        { geoId: 'USA_CA', geoName: 'California' },
        { geoId: 'USA_TX', geoName: 'Texas' },
        { geoId: 'CAN_ON', geoName: 'Ontario' }
      ]
    }
  };

  beforeEach(async () => {
    const partyServiceSpy = jasmine.createSpyObj('PartyService', ['createBankAccount']);
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddEditBankAccountComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    })
      .overrideComponent(AddEditBankAccountComponent, {
        set: { template: '<form [formGroup]="addEditBankAccountForm"></form>' },
      })
      .compileComponents();

    partyService = TestBed.inject(PartyService) as jasmine.SpyObj<PartyService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<AddEditBankAccountComponent>>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEditBankAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with provided bankAccountData', () => {
    const form = component.addEditBankAccountForm;
    expect(form.get('firstNameOnAccount')?.value).toBe('John');
    expect(form.get('bankName')?.value).toBe('Bank of Test');
    expect(form.get('countryGeoId')?.value).toBe('USA');
    expect(form.get('existingAddressId')?.value).toBe('ADDR1');
  });

  it('should filter states by selected country', () => {
    const filtered = component.filterStatesByCountry(dialogData.bankAccountData.states);
    expect(filtered).toHaveSize(2);
    expect(filtered[0].geoId).toBe('USA_CA');
  });

  it('should call createBankAccount with existing address payload and close dialog on success', fakeAsync(() => {
    const formValues = component.addEditBankAccountForm.getRawValue();
    partyService.createBankAccount.and.returnValue(of({}));
    const expectedPayload = {
      description: formValues.description,
      firstNameOnAccount: formValues.firstNameOnAccount,
      lastNameOnAccount: formValues.lastNameOnAccount,
      companyNameOnAccount: formValues.companyNameOnAccount,
      routingNumber: formValues.routingNumber,
      bankName: formValues.bankName,
      accountNumber: formValues.accountNumber,
      roleTypeId: formValues.roleTypeId,
      postalAddressId: formValues.postalContactMechId,
      toName: null,
      address1: null,
      address2: null,
      city: null,
      postalCode: null,
      countryGeoId: null,
      stateProvinceGeoId: null,
    };
    const expectedCloseResult = {
      ...expectedPayload,
      partyId: formValues.partyId,
    };

    component.addEditBankAccount();
    tick();

    expect(partyService.createBankAccount).toHaveBeenCalledWith(formValues.partyId, expectedPayload);
    expect(translateService.instant).toHaveBeenCalledWith('PARTY.BANK_ACCOUNT_SAVE_SUCCESS');
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('PARTY.BANK_ACCOUNT_SAVE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(expectedCloseResult);
  }));

  it('should send a new-address payload when create new address is enabled', fakeAsync(() => {
    component.addEditBankAccountForm.get('createNewAddress')?.enable({ emitEvent: false });
    component.addEditBankAccountForm.get('createNewAddress')?.setValue(true);
    component.addEditBankAccountForm.patchValue({
      toName: 'John Doe',
      address1: '123 Test St',
      city: 'Testville',
      postalCode: '12345',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'USA_CA',
    });
    partyService.createBankAccount.and.returnValue(of({}));

    component.addEditBankAccount();
    tick();

    const [partyId, payload] = partyService.createBankAccount.calls.mostRecent().args;
    expect(partyId).toBe('PARTY123');
    expect(payload['postalAddressId']).toBeNull();
    expect(payload['address1']).toBe('123 Test St');
    expect(payload['city']).toBe('Testville');
    expect(payload['countryGeoId']).toBe('USA');
  }));

  it('should handle error on createBankAccount failure', fakeAsync(() => {
    partyService.createBankAccount.and.returnValue(throwError(() => new Error('API failure')));

    component.addEditBankAccount();
    tick();

    expect(translateService.instant).toHaveBeenCalledWith('PARTY.BANK_ACCOUNT_SAVE_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('PARTY.BANK_ACCOUNT_SAVE_ERROR');
  }));

  it('should reset stateProvinceGeoId when countryGeoId changes', fakeAsync(() => {
    component.addEditBankAccountForm.get('countryGeoId')?.setValue('USA');
    tick();
    expect(component.addEditBankAccountForm.get('stateProvinceGeoId')?.value).toBe('');
    expect(component.states.length).toBeGreaterThan(0);
  }));

  it('should populate existing address values when createNewAddress is disabled', () => {
    expect(component.addEditBankAccountForm.get('postalContactMechId')?.value).toBe('ADDR1');
    expect(component.addEditBankAccountForm.get('address1')?.value).toBe('123 Test St');
  });

  it('should allow switching to create new address mode', () => {
    component.addEditBankAccountForm.get('createNewAddress')?.enable({ emitEvent: false });
    component.addEditBankAccountForm.get('createNewAddress')?.setValue(true);

    expect(component.addEditBankAccountForm.get('postalContactMechId')?.value).toBe('');
    expect(component.addEditBankAccountForm.get('address1')?.hasValidator(Validators.required)).toBeTrue();
  });

  it('should copy values from an existing address and clear fields when the address is missing', () => {
    component.addEditBankAccountForm.get('createNewAddress')?.enable({ emitEvent: false });
    component.addEditBankAccountForm.get('createNewAddress')?.setValue(true);

    component.addEditBankAccountForm.get('copyFromAddressId')?.setValue('ADDR1');
    expect(component.addEditBankAccountForm.get('address1')?.value).toBe('123 Test St');
    expect(component.addEditBankAccountForm.get('city')?.value).toBe('Testville');

    component.addEditBankAccountForm.get('createNewAddress')?.setValue(false);
    component.addEditBankAccountForm.get('existingAddressId')?.setValue('MISSING');

    expect(component.addEditBankAccountForm.get('postalContactMechId')?.value).toBe('MISSING');
    expect(component.addEditBankAccountForm.get('address1')?.value).toBe('');
    expect(component.addEditBankAccountForm.get('countryGeoId')?.value).toBe('USA');
  });

  it('should not call the service when the form is invalid', () => {
    component.addEditBankAccountForm.get('accountNumber')?.setValue('');

    component.addEditBankAccount();

    expect(partyService.createBankAccount).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });
});
