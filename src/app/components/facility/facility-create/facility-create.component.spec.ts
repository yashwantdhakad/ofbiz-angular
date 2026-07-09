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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { OrderService } from '@ofbiz/services/order/order.service';

import { FacilityCreateComponent } from './facility-create.component';

describe('FacilityCreateComponent', () => {
  let component: FacilityCreateComponent;
  let fixture: ComponentFixture<FacilityCreateComponent>;
  let facilityService: jasmine.SpyObj<FacilityService>;
  let orderService: jasmine.SpyObj<OrderService>;
  let store: jasmine.SpyObj<Store>;
  let router: Router;

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('FacilityService', ['createFacility', 'getFacilityTypes']);
    const orderSpy = jasmine.createSpyObj('OrderService', ['getProductStores']);
    const storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'pipe']);
    storeSpy.pipe.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      declarations: [FacilityCreateComponent],
      imports: [ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: FacilityService, useValue: serviceSpy },
        { provide: OrderService, useValue: orderSpy },
        { provide: Store, useValue: storeSpy },
      ],
    }).compileComponents();

    facilityService = TestBed.inject(FacilityService) as jasmine.SpyObj<FacilityService>;
    orderService = TestBed.inject(OrderService) as jasmine.SpyObj<OrderService>;
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    router = TestBed.inject(Router);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityCreateComponent);
    component = fixture.componentInstance;
    facilityService.getFacilityTypes.and.returnValue(of([]));
    orderService.getProductStores.and.returnValue(of([]));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call service on submit', () => {
    facilityService.createFacility.and.returnValue(of({}));
    const navigateSpy = spyOn(router, 'navigate');
    component.form.setValue({
      facilityId: 'F1',
      facilityName: 'Name',
      facilityTypeId: 'WAREHOUSE',
      requireInspection: false,
      ownerPartyId: 'OWNER1',
      toName: 'Name',
      address1: '123 Main St',
      address2: '',
      city: 'Salt Lake City',
      postalCode: '84111',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'UT',
    });
    component.submit();
    expect(facilityService.createFacility).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/facilities']);
  });

  it('should cover lookup failures, state filtering, and invalid submit guard', () => {
    facilityService.getFacilityTypes.and.returnValue(throwError(() => new Error('types')));
    orderService.getProductStores.and.returnValue(throwError(() => new Error('stores')));

    component.ngOnInit();
    expect(component.facilityTypes).toEqual([]);
    expect(component.ownerPartyOptions).toEqual([]);

    component.states = [
      { geo_id: 'UT', country_geo_id: 'USA' },
      { geo_id: 'ON', country_geo_id: 'CAN' },
      { geo_id: 'GEN' },
    ] as any;
    component.form.get('countryGeoId')?.setValue('CAN');
    expect(component.filterStatesByCountry(component.states).map((item) => item.geo_id)).toEqual(['ON', 'GEN']);

    facilityService.createFacility.calls.reset();
    component.form.patchValue({
      facilityId: '',
      facilityName: '',
      address1: '',
      city: '',
      postalCode: '',
    });
    component.submit();
    expect(facilityService.createFacility).not.toHaveBeenCalled();
  });

  it('should finalize loading on create error', () => {
    facilityService.createFacility.and.returnValue(throwError(() => new Error('save failed')));
    component.form.setValue({
      facilityId: 'F1',
      facilityName: 'Name',
      facilityTypeId: 'WAREHOUSE',
      requireInspection: true,
      ownerPartyId: 'OWNER1',
      toName: '',
      address1: '123 Main St',
      address2: '',
      city: 'Salt Lake City',
      postalCode: '84111',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'UT',
    });

    component.submit();

    expect(facilityService.createFacility).toHaveBeenCalledWith(jasmine.objectContaining({
      requireInspection: 'Y',
      ownerPartyId: 'OWNER1',
      address: jasmine.objectContaining({ toName: 'Name' }),
    }));
    expect(component.isLoading()).toBeFalse();
  });

  it('should dedupe owner party ids and ignore blank values', () => {
    orderService.getProductStores.and.returnValue(of([
      { payToPartyId: 'OWNER1' },
      { payToPartyId: ' OWNER1 ' },
      { payToPartyId: 'OWNER2' },
      { payToPartyId: '' },
      {},
    ] as any));

    component.loadOwnerPartyOptions();

    expect(component.ownerPartyOptions).toEqual(['OWNER1', 'OWNER2']);
  });

  it('should preserve explicit toName and include null address2 in payload', () => {
    facilityService.createFacility.and.returnValue(of({}));
    const navigateSpy = spyOn(router, 'navigate');
    component.form.setValue({
      facilityId: 'F2',
      facilityName: 'Facility Two',
      facilityTypeId: 'WAREHOUSE',
      requireInspection: false,
      ownerPartyId: 'OWNER1',
      toName: 'Receiving Desk',
      address1: '456 Main St',
      address2: '',
      city: 'Denver',
      postalCode: '80014',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'CO',
    });

    component.submit();

    expect(facilityService.createFacility).toHaveBeenCalledWith(jasmine.objectContaining({
      requireInspection: 'N',
      address: jasmine.objectContaining({
        toName: 'Receiving Desk',
        address2: null,
      }),
    }));
    expect(navigateSpy).toHaveBeenCalledWith(['/facilities']);
  });
});
