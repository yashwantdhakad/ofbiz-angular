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
import { AddEditAddressComponent } from './add-edit-address.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { OrderService } from '@ofbiz/services/order/order.service';
import { signal } from '@angular/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

describe('AddEditAddressComponent', () => {
  let component: AddEditAddressComponent;
  let fixture: ComponentFixture<AddEditAddressComponent>;
  let mockPartyService: jasmine.SpyObj<PartyService>;
  let mockOrderService: jasmine.SpyObj<OrderService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<AddEditAddressComponent>>;
  let referenceDataStoreStub: any;

  const mockAddressData = {
    partyId: 'PARTY-1',
    contactMechPurposeId: '',
    contactMechId: 'ADDR-1',
    toName: 'John Doe',
    address1: '123 Test St',
    address2: '',
    city: 'Testville',
    postalCode: '12345',
    countryGeoId: 'USA',
    stateProvinceGeoId: 'USA_CA',
    countries: [{ geoId: 'USA', geoName: 'United States' }],
    states: [
      { geoId: 'USA_CA', geoName: 'California' },
      { geoId: 'USA_TX', geoName: 'Texas' }
    ]
  };

  beforeEach(async () => {
    mockPartyService = jasmine.createSpyObj('PartyService', ['updatePostalAddress', 'addPostalAddress']);
    mockOrderService = jasmine.createSpyObj('OrderService', ['addOrderAddress', 'updateOrderAddress']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    referenceDataStoreStub = {
      countries: signal([]),
      states: signal([]),
      ensureGeosLoaded: jasmine.createSpy('ensureGeosLoaded'),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, AddEditAddressComponent],
      providers: [
        { provide: PartyService, useValue: mockPartyService },
        { provide: OrderService, useValue: mockOrderService },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: MAT_DIALOG_DATA, useValue: { addressData: mockAddressData } },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    spyOn(console, 'error').and.stub();
    fixture = TestBed.createComponent(AddEditAddressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with address data', () => {
    expect(component.addEditAddressForm.get('toName')?.value).toEqual('John Doe');
    expect(component.states.length).toBeGreaterThan(0);
  });

  it('should reset stateProvinceGeoId on country change', fakeAsync(() => {
    component.addEditAddressForm.get('countryGeoId')?.setValue('USA');
    tick(300); // simulate async
    expect(component.addEditAddressForm.get('stateProvinceGeoId')?.value).toBe('');
  }));

  it('should call partyService.updatePostalAddress and close dialog on success', () => {
    mockPartyService.updatePostalAddress.and.returnValue(of({}));

    component.addEditAddressForm.markAllAsTouched();
    component.addEditAddress();

    expect(mockPartyService.updatePostalAddress).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show error and not close dialog on service failure', () => {
    mockPartyService.updatePostalAddress.and.returnValue(throwError(() => new Error('Service error')));

    component.addEditAddressForm.markAllAsTouched();
    component.addEditAddress();

    expect(mockPartyService.updatePostalAddress).toHaveBeenCalled();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});
