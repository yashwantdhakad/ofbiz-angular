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
import { EditSupplierComponent } from './edit-supplier.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

describe('EditSupplierComponent', () => {
  let component: EditSupplierComponent;
  let fixture: ComponentFixture<EditSupplierComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditSupplierComponent>>;


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
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['updateSupplier']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [EditSupplierComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useClass: TranslateServiceMock },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            supplierDetail: {
              partyId: 'SUPP-1001',
              groupName: 'Supplier Inc.'
            }
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditSupplierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should call updateSupplier and close dialog on success', fakeAsync(() => {
    partyServiceSpy.updateSupplier.and.returnValue(of({}));

    const formValues = {
      partyId: 'SUPP-1001',
      groupName: 'Updated Supplier'
    };

    component.updateSupplierForm.setValue(formValues);

    component.updateSupplier();
    tick();

    expect(partyServiceSpy.updateSupplier).toHaveBeenCalledWith(formValues);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('SUPPLIER.UPDATED_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(formValues);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error if API call fails', fakeAsync(() => {
    partyServiceSpy.updateSupplier.and.returnValue(throwError(() => new Error('API Error')));

    component.updateSupplierForm.setValue({
      partyId: 'SUPP-1001',
      groupName: 'Updated Supplier'
    });

    component.updateSupplier();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('SUPPLIER.ERROR_UPDATE');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should not submit if form is invalid', () => {
    component.updateSupplierForm.setValue({
      partyId: 'SUPP-1001',
      groupName: ''
    });

    component.updateSupplier();

    expect(partyServiceSpy.updateSupplier).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });
});
