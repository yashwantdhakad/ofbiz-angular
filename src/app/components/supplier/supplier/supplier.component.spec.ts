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
import { SupplierComponent } from './supplier.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { MatSort } from '@angular/material/sort';

describe('SupplierComponent', () => {
  let component: SupplierComponent;
  let fixture: ComponentFixture<SupplierComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['getSuppliers']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showError']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [SupplierComponent],
      providers: [
        provideRouter([]),
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
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

    fixture = TestBed.createComponent(SupplierComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch suppliers on init', fakeAsync(() => {
    const mockResponse = {
      resultList: [{ partyId: 'SUPP1', groupName: 'Test Supplier', contactNumber: '1234567890', emailAddress: 'test@example.com' }],
      documentListCount: 1,
    };
    partyServiceSpy.getSuppliers.and.returnValue(of(mockResponse));

    fixture.detectChanges(); // triggers ngOnInit
    tick(300);

    expect(partyServiceSpy.getSuppliers).toHaveBeenCalledWith(0, '', undefined, undefined, undefined);
    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error when getSuppliers fails', fakeAsync(() => {
    partyServiceSpy.getSuppliers.and.returnValue(throwError(() => new Error('API Error')));

    fixture.detectChanges();
    tick(300);

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('SUPPLIER.FETCH_LIST_ERROR');
    expect(component.items()).toEqual([]);
    expect(component.pages()).toBe(0);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should request next page', () => {
    const mockResponse = { resultList: [{ partyId: 'SUPP2' }], documentListCount: 2 };
    partyServiceSpy.getSuppliers.and.returnValue(of(mockResponse));
    component.queryString.set('supp');

    component.onPageChange(1);

    expect(partyServiceSpy.getSuppliers).toHaveBeenCalledWith(1, 'supp', undefined, undefined, undefined);
  });

  it('should toggle sort direction and expose helper methods', () => {
    partyServiceSpy.getSuppliers.and.returnValue(of({ resultList: [], documentListCount: 0 }));
    component.pagination.update((state) => ({ ...state, page: 3 }));
    component.sort = { active: '', direction: '' } as MatSort;

    component.onSortChange({ active: 'groupName', direction: 'asc' } as any);
    expect(component.currentSort()).toEqual({ active: 'groupName', direction: 'asc' });
    expect(component.sort?.direction).toBe('asc');
    expect(partyServiceSpy.getSuppliers).toHaveBeenCalledWith(2, '', 'groupName', 'asc', undefined);

    partyServiceSpy.getSuppliers.calls.reset();
    component.onSortChange({ active: 'groupName', direction: 'asc' } as any);
    expect(component.currentSort()).toEqual({ active: 'groupName', direction: 'desc' });
    expect(partyServiceSpy.getSuppliers).toHaveBeenCalledWith(2, '', 'groupName', 'desc', undefined);

    expect(component.getValue({ nested: { value: 5 } }, 'nested.value')).toBe(5);
    expect(component.getValue(null as any, 'nested.value')).toBeNull();
    expect(component.trackBySupplierColumn(0, { key: 'partyId' })).toBe('partyId');
    expect(component.trackBySupplierRow(0, { partyId: 'SUPP9' })).toBe('SUPP9');
    expect(component.trackBySupplierRow(2, {})).toBe(2);
  });
});
