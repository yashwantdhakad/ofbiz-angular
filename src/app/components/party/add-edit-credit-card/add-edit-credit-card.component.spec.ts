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
import { AddEditCreditCardComponent } from './add-edit-credit-card.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('AddEditCreditCardComponent', () => {
  let component: AddEditCreditCardComponent;
  let fixture: ComponentFixture<AddEditCreditCardComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddEditCreditCardComponent>>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const mockData = {
    creditCardData: {
      partyId: 'PARTY_001',
      paymentMethodId: '',
      firstNameOnAccount: 'John',
      lastNameOnAccount: 'Doe',
      cardNumber: '4111111111111111',
      expireMonth: 12,
      expireYear: 2030,
      creditCardTypeEnumId: 'CctVisa',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'USA_CA',
      address1: '123 Test St',
      city: 'Testville',
      postalCode: '12345',
      toName: 'John Doe',
      countries: [{ geoId: 'USA', geoName: 'United States' }],
      states: [{ geoId: 'USA_CA', geoName: 'California' }],
    }
  };

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', [
      'createCreditCard',
      'getPaymentMethodTypes',
      'getEnumerations',
    ]);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateServiceSpy.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddEditCreditCardComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    })
      .overrideComponent(AddEditCreditCardComponent, {
        set: { template: '<form [formGroup]="addEditCreditCardForm"></form>' },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEditCreditCardComponent);
    component = fixture.componentInstance;
    partyServiceSpy.getPaymentMethodTypes.and.returnValue(of([]));
    partyServiceSpy.getEnumerations.and.returnValue(of([]));
    commonServiceSpy.getLookupResults.and.returnValue(of([]));
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with provided credit card data', () => {
    const form = component.addEditCreditCardForm;
    expect(form.get('firstNameOnAccount')?.value).toBe('John');
    expect(form.get('lastNameOnAccount')?.value).toBe('Doe');
    expect(component.states.length).toBeGreaterThan(0);
  });

  it('should call PartyService.createCreditCard on valid form submission', fakeAsync(() => {
    const form = component.addEditCreditCardForm;
    partyServiceSpy.createCreditCard.and.returnValue(of({}));

    form.patchValue({
      createNewAddress: true,
      creditCardTypeEnumId: 'CctVisa',
      cardNumber: '4111111111111111',
      expireMonth: 12,
      expireYear: 2030,
      firstNameOnAccount: 'John',
      lastNameOnAccount: 'Doe',
      toName: 'John Doe',
      address1: '123 Test St',
      city: 'Testville',
      postalCode: '12345',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'USA_CA',
    });
    expect(form.valid).toBeTrue();
    component.addEditCreditCard();

    tick();
    expect(partyServiceSpy.createCreditCard).toHaveBeenCalledWith('PARTY_001', jasmine.any(Object));
    expect(translateServiceSpy.instant).toHaveBeenCalledWith('PARTY.CREDIT_CARD_SAVE_SUCCESS');
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('PARTY.CREDIT_CARD_SAVE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalled();
  }));

  it('should not submit form if invalid', () => {
    component.addEditCreditCardForm.patchValue({ firstNameOnAccount: '' }); // Make form invalid
    component.addEditCreditCard();

    expect(partyServiceSpy.createCreditCard).not.toHaveBeenCalled();
    expect(component.addEditCreditCardForm.touched).toBeFalse();
  });

  it('should show error if service fails', fakeAsync(() => {
    const form = component.addEditCreditCardForm;
    partyServiceSpy.createCreditCard.and.returnValue(
      throwError(() => new Error('error'))
    );

    form.patchValue({
      createNewAddress: true,
      creditCardTypeEnumId: 'CctVisa',
      cardNumber: '4111111111111111',
      expireMonth: 12,
      expireYear: 2030,
      firstNameOnAccount: 'John',
      lastNameOnAccount: 'Doe',
      toName: 'John Doe',
      address1: '123 Test St',
      city: 'Testville',
      postalCode: '12345',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'USA_CA',
    });
    expect(form.valid).toBeTrue();
    component.addEditCreditCard();

    tick();
    expect(partyServiceSpy.createCreditCard).toHaveBeenCalledWith('PARTY_001', jasmine.any(Object));
    expect(translateServiceSpy.instant).toHaveBeenCalledWith('PARTY.CREDIT_CARD_SAVE_ERROR');
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('PARTY.CREDIT_CARD_SAVE_ERROR');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  }));

  it('should derive default address id and copy address details from an existing address', () => {
    component.data.creditCardData.postalAddressList = [
      {
        contactMechId: 'ADDR-1',
        contactMechPurposeId: 'PRIMARY_LOCATION',
        toName: 'Main',
        address1: 'One Main St',
        city: 'Austin',
        postalCode: '78701',
        countryGeoId: 'USA',
        stateProvinceGeoId: 'USA_TX',
      } as any,
    ];

    component.ngOnInit();
    component.addEditCreditCardForm.patchValue({
      createNewAddress: true,
      copyFromAddressId: 'ADDR-1',
    });

    expect(component.addEditCreditCardForm.get('existingAddressId')?.value).toBe('ADDR-1');
    expect(component.addEditCreditCardForm.get('address1')?.value).toBe('One Main St');
    expect(component.addEditCreditCardForm.get('city')?.value).toBe('Austin');
  });

  it('should clear address fields and postal contact when toggling back to a new address', () => {
    component.addEditCreditCardForm.patchValue({
      createNewAddress: false,
      existingAddressId: 'ADDR-2',
      postalContactMechId: 'ADDR-2',
    });

    component.addEditCreditCardForm.get('createNewAddress')?.setValue(true);

    expect(component.addEditCreditCardForm.get('postalContactMechId')?.value).toBe('');
    expect(component.addEditCreditCardForm.get('countryGeoId')?.value).toBe('USA');
    expect(component.addEditCreditCardForm.get('stateProvinceGeoId')?.value).toBe('');
  });

  it('should derive the primary address id and keep create-new toggle behavior consistent', () => {
    component.data.creditCardData.postalAddressList = [
      {
        contactMechId: 'ADDR-1',
        contactMechPurposeId: 'SHIPPING_LOCATION',
        toName: 'Ship To',
        address1: 'Ship St',
      } as any,
      {
        contactMechId: 'ADDR-2',
        contactMechPurposeId: 'PRIMARY_LOCATION',
        toName: 'Primary',
        address1: 'Primary St',
      } as any,
    ];

    component.ngOnInit();
    expect(component.addEditCreditCardForm.get('existingAddressId')?.value).toBe('ADDR-2');

    component.addEditCreditCardForm.get('createNewAddress')?.setValue(false);
    expect(component.addEditCreditCardForm.get('postalContactMechId')?.value).toBe('ADDR-2');
    expect(component.addEditCreditCardForm.get('countryGeoId')?.value).toBe('USA');

    component.addEditCreditCardForm.get('copyFromAddressId')?.setValue('');
    expect(component.addEditCreditCardForm.get('toName')?.value).toBe('');
    expect(component.getAddressLabel(undefined)).toBe('');
  });

  it('should filter states safely and format address labels', () => {
    component.addEditCreditCardForm.patchValue({ countryGeoId: 'USA' });
    expect(component.filterStatesByCountry([
      { geo_id: 'USA_CA', country_geo_id: 'USA' },
      { geoId: 'IND_KA', countryGeoId: 'IND' },
      { geoId: 'USA_TX' },
    ] as any)).toEqual([
      { geo_id: 'USA_CA', country_geo_id: 'USA' } as any,
      { geoId: 'USA_TX' } as any,
    ]);
    expect(component.filterStatesByCountry(null as any)).toEqual([]);
    expect(component.getAddressLabel({
      address1: 'Street 1',
      city: 'City',
      stateProvinceGeoId: 'CA',
      postalCode: '12345',
      countryGeoId: 'USA',
    } as any)).toContain('Street 1');
    expect(component.getAddressLabel(null)).toBe('');
  });

  it('should cover lookup fallback paths and state filtering edge cases', () => {
    expect(component.filterStatesByCountry('not-an-array' as any)).toEqual([]);
    component.addEditCreditCardForm.patchValue({ countryGeoId: 'CAN' });
    expect(component.filterStatesByCountry([
      { geoId: 'CAN_ON' },
      { geoId: 'USA_TX', countryGeoId: 'USA' },
    ] as any)).toEqual([{ geoId: 'CAN_ON' } as any]);

    component.data.creditCardData.countries = [{ geo_id: 'USA', geo_name: 'United States' }] as any;
    component.data.creditCardData.states = [{ geoId: 'USA_CA', geoName: 'California' }] as any;
    component.ngOnInit();
    expect(component.countries).toEqual([{ geo_id: 'USA', geo_name: 'United States' }] as any);
    expect(component.states).toEqual([{ geoId: 'USA_CA', geoName: 'California' }] as any);
  });

  it('should cover invalid save guard and successful reset behavior', fakeAsync(() => {
    component.addEditCreditCardForm.patchValue({
      firstNameOnAccount: '',
      lastNameOnAccount: '',
      cardNumber: '',
    });
    component.addEditCreditCard();
    tick();

    expect(partyServiceSpy.createCreditCard).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();

    component.addEditCreditCardForm.patchValue({
      createNewAddress: true,
      creditCardTypeEnumId: 'CctVisa',
      cardNumber: '4111111111111111',
      expireMonth: 12,
      expireYear: 2030,
      firstNameOnAccount: 'John',
      lastNameOnAccount: 'Doe',
      toName: 'John Doe',
      address1: '123 Test St',
      city: 'Testville',
      postalCode: '12345',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'USA_CA',
    });
    partyServiceSpy.createCreditCard.and.returnValue(of({}));

    component.addEditCreditCard();
    tick();

    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('PARTY.CREDIT_CARD_SAVE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({ partyId: 'PARTY_001' }));
    expect(component.addEditCreditCardForm.pristine).toBeTrue();
  }));

  it('should use provided country/state options without calling lookup services again', () => {
    component.data.creditCardData.countries = [{ geo_id: 'USA', geo_name: 'United States' }] as any;
    component.data.creditCardData.states = [{ geo_id: 'USA_CA', country_geo_id: 'USA' }] as any;
    commonServiceSpy.getLookupResults.calls.reset();

    component.ngOnInit();

    expect(component.countries).toEqual([{ geo_id: 'USA', geo_name: 'United States' }] as any);
    expect(component.states).toEqual([{ geo_id: 'USA_CA', country_geo_id: 'USA' }] as any);
    expect(commonServiceSpy.getLookupResults).not.toHaveBeenCalled();
  });
});
