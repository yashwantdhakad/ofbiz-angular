import { provideRouter } from '@angular/router';
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
import { of, throwError } from 'rxjs';
import { CustomerComponent } from './customer.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatSort } from '@angular/material/sort';

describe('CustomerComponent', () => {
  let component: CustomerComponent;
  let fixture: ComponentFixture<CustomerComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    const partySpy = jasmine.createSpyObj('PartyService', ['getCustomers']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [CustomerComponent],
      providers: [
        provideRouter([]),
        { provide: PartyService, useValue: partySpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            get: (key: string) => of(key),
            stream: (key: string) => of(key),
            onLangChange: of({}),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
          }
        },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerComponent);
    component = fixture.componentInstance;
    partyServiceSpy = TestBed.inject(PartyService) as jasmine.SpyObj<PartyService>;
    snackbarServiceSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch customers on init', fakeAsync(() => {
    const response = { resultList: [{ partyId: 'P1' }], documentListCount: 1 };
    partyServiceSpy.getCustomers.and.returnValue(of(response));

    fixture.detectChanges(); // triggers ngOnInit
    tick(300);

    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(1);
    expect(partyServiceSpy.getCustomers).toHaveBeenCalledWith(0, '', undefined, undefined, undefined);
  }));

  it('should handle error during search', fakeAsync(() => {
    partyServiceSpy.getCustomers.and.returnValue(throwError(() => new Error('API error')));

    fixture.detectChanges();
    tick(300);

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('CUSTOMER.FETCH_LIST_ERROR');
  }));

  it('should request next page', () => {
    const response = { resultList: [{ partyId: 'P2' }], documentListCount: 2 };
    partyServiceSpy.getCustomers.and.returnValue(of(response));
    component.queryString.set('john');

    component.onPageChange(1);

    expect(partyServiceSpy.getCustomers).toHaveBeenCalledWith(1, 'john', undefined, undefined, undefined);
  });

  it('should return column keys from config', () => {
    expect(component.columnKeys).toEqual(['partyId', 'firstName', 'lastName', 'contactNumber', 'emailAddress']);
  });

  it('should return value for direct and nested properties', () => {
    const element = { name: 'John', contact: { phone: '12345' } };
    expect(component.getValue(element, 'name')).toBe('John');
    expect(component.getValue(element, 'contact.phone')).toBe('12345');
  });

  it('should toggle sort direction and expose fallback helpers', () => {
    partyServiceSpy.getCustomers.and.returnValue(of({ resultList: [], documentListCount: 0 }));
    component.pagination.update((state) => ({ ...state, page: 3 }));
    component.sort = { active: '', direction: '' } as MatSort;

    component.onSortChange({ active: 'firstName', direction: 'asc' } as any);
    expect(component.currentSort()).toEqual({ active: 'firstName', direction: 'asc' });
    expect(component.sort?.direction).toBe('asc');
    expect(partyServiceSpy.getCustomers).toHaveBeenCalledWith(2, '', 'firstName', 'asc', undefined);

    partyServiceSpy.getCustomers.calls.reset();
    component.onSortChange({ active: 'firstName', direction: 'asc' } as any);
    expect(component.currentSort()).toEqual({ active: 'firstName', direction: 'desc' });
    expect(partyServiceSpy.getCustomers).toHaveBeenCalledWith(2, '', 'firstName', 'desc', undefined);

    expect(component.getValue({ groupName: 'Acme', partyId: 'P1' }, 'firstName')).toBe('Acme');
    expect(component.getValue({ partyId: 'P2' }, 'firstName')).toBe('P2');
    expect(component.getValue({}, 'lastName')).toBe('-');
    expect(component.trackByCustomerColumn(0, { key: 'partyId' })).toBe('partyId');
    expect(component.trackByCustomerRow(0, { partyId: 'P9' })).toBe('P9');
    expect(component.trackByCustomerRow(3, {})).toBe(3);
  });
});
