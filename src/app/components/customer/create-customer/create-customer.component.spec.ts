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
import { ReactiveFormsModule } from '@angular/forms';
import { CreateCustomerComponent } from './create-customer.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

describe('CreateCustomerComponent', () => {
  let component: CreateCustomerComponent;
  let fixture: ComponentFixture<CreateCustomerComponent>;
  let partyService: jasmine.SpyObj<PartyService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let router: jasmine.SpyObj<Router>;
  let referenceDataStoreStub: any;


  // Custom mock for TranslateService
  class TranslateServiceMock {
    instant(key: string): string { return key; }
    get(key: string | string[]): any { return of(key); }
    use(_lang: string): any { return of(_lang); }
    setDefaultLang(_lang: string): void { }
    addLangs(_langs: string[]): void { }
    getBrowserLang(): string | undefined { return 'en'; }
    stream(key: string | string[]): any { return of(key); }
    getParsedResult(_translations: any, key: string, _params?: any): any { return key; }
    onLangChange = of({ lang: 'en', translations: {} });
    onTranslationChange = of({});
    onDefaultLangChange = of({});
    currentLang = 'en';
    defaultLang = 'en';
  }

  beforeEach(async () => {
    const partyServiceSpy = jasmine.createSpyObj('PartyService', ['createCustomer']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask', 'defer', 'detectChanges', 'markForCheck']);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.defer.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.detectChanges.and.stub();
    renderSchedulerSpy.markForCheck.and.stub();

    referenceDataStoreStub = {
      countries: signal([]),
      states: signal([]),
      statesByCountry: jasmine.createSpy('statesByCountry').and.returnValue([]),
      ensureGeosLoaded: jasmine.createSpy('ensureGeosLoaded'),
    };

    await TestBed.configureTestingModule({
      declarations: [CreateCustomerComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useClass: TranslateServiceMock },
        { provide: Router, useValue: routerSpy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    partyService = TestBed.inject(PartyService) as jasmine.SpyObj<PartyService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateCustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    const form = component.createCustomerForm;
    expect(form).toBeTruthy();
    expect(form.get('firstName')?.value).toBe('');
    expect(form.get('roleTypeId')?.value).toBe('CUSTOMER');
    expect(form.get('countryGeoId')?.value).toBe('USA');
  });

  it('should derive states by selected country', () => {
    const mockStates = [
      { geoId: 'USA_TX', country_geo_id: 'USA' },
      { geoId: 'USA_CA', country_geo_id: 'USA' },
      { geoId: 'CAN_ON', country_geo_id: 'CAN' },
    ];
    referenceDataStoreStub.statesByCountry.and.callFake((countryGeoId: string) =>
      mockStates.filter((state) => state.country_geo_id === countryGeoId)
    );

    component.selectedCountryGeoId.set('CAN');
    component.selectedCountryGeoId.set('USA');

    const result = component.filteredStates();
    expect(result).toHaveSize(2);
    expect(result[0].geoId).toBe('USA_TX');
  });

  it('should call createCustomer and navigate on success', fakeAsync(() => {
    const formValues = {
      firstName: 'John',
      lastName: 'Doe',
      emailAddress: 'john.doe@example.com',
      contactNumber: '1234567890',
      roleTypeId: 'CUSTOMER',
      address1: '123 Street',
      address2: '',
      city: 'NYC',
      postalCode: '10001',
      countryGeoId: 'USA',
      stateProvinceGeoId: 'USA_NY',
    };

    component.createCustomerForm.setValue(formValues);
    partyService.createCustomer.and.returnValue(of({ partyId: 'CUST123' }));

    component.createCustomer();
    tick();

    expect(partyService.createCustomer).toHaveBeenCalledWith({
      ...formValues,
      toName: 'John Doe',
    });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('CUSTOMER.CREATED_SUCCESS');
    expect(router.navigate).toHaveBeenCalledWith(['/customers/CUST123']);
  }));

  it('should show error if response does not have partyId', fakeAsync(() => {
    const formValues = { ...component.createCustomerForm.value, firstName: 'A', lastName: 'B', emailAddress: 'a@b.com', contactNumber: '1234567890', address1: 'addr', city: 'city', postalCode: '12345', stateProvinceGeoId: 'USA_CA' };
    component.createCustomerForm.setValue(formValues);
    partyService.createCustomer.and.returnValue(of({}));

    component.createCustomer();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('CUSTOMER.FAILED_CREATE');
  }));

  it('should handle error in createCustomer call', fakeAsync(() => {
    const formValues = { ...component.createCustomerForm.value, firstName: 'A', lastName: 'B', emailAddress: 'a@b.com', contactNumber: '1234567890', address1: 'addr', city: 'city', postalCode: '12345', stateProvinceGeoId: 'USA_CA' };
    component.createCustomerForm.setValue(formValues);
    partyService.createCustomer.and.returnValue(throwError(() => new Error('Failure')));

    component.createCustomer();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('CUSTOMER.ERROR_CREATE');
  }));
});
