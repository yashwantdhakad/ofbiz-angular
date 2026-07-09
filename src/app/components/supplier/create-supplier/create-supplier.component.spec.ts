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
import { CreateSupplierComponent } from './create-supplier.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CreateSupplierComponent', () => {
  let component: CreateSupplierComponent;
  let fixture: ComponentFixture<CreateSupplierComponent>;
  let mockPartyService: jasmine.SpyObj<PartyService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;


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
    mockPartyService = jasmine.createSpyObj('PartyService', ['createSupplier']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    await TestBed.configureTestingModule({
      declarations: [CreateSupplierComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: PartyService, useValue: mockPartyService },
        { provide: Router, useValue: mockRouter },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useClass: TranslateServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSupplierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should call partyService.createSupplier and navigate on success', fakeAsync(() => {
    const supplierData = {
      partyId: 'SUPP1001'
    };

    const formValues = {
      groupName: 'Test Supplier',
      emailAddress: 'test@supplier.com',
      contactNumber: '1234567890',
      roleTypeId: 'SUPPLIER'
    };

    mockPartyService.createSupplier.and.returnValue(of(supplierData));

    component.supplierForm.setValue(formValues);

    component.createSupplier();
    tick();

    expect(component.isLoading()).toBeFalse();
    expect(mockPartyService.createSupplier).toHaveBeenCalledWith(formValues);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/suppliers/SUPP1001']);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('SUPPLIER.CREATED_SUCCESS');
  }));

  it('should handle error if API fails', fakeAsync(() => {
    mockPartyService.createSupplier.and.returnValue(throwError(() => new Error('API Error')));

    component.supplierForm.setValue({
      groupName: 'Test Supplier',
      emailAddress: 'test@supplier.com',
      contactNumber: '1234567890',
      roleTypeId: 'SUPPLIER'
    });

    component.createSupplier();
    tick();

    expect(component.isLoading()).toBeFalse();
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('SUPPLIER.ERROR_CREATE');
  }));

  it('should not submit if form is invalid', () => {
    component.supplierForm.setValue({ groupName: '', emailAddress: '', contactNumber: '', roleTypeId: 'SUPPLIER' });

    component.createSupplier();

    expect(mockPartyService.createSupplier).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });
});
