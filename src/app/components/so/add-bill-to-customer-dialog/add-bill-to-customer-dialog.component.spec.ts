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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { AddBillToCustomerDialogComponent } from './add-bill-to-customer-dialog.component';

describe('AddBillToCustomerDialogComponent', () => {
  let component: AddBillToCustomerDialogComponent;
  let fixture: ComponentFixture<AddBillToCustomerDialogComponent>;
  let partyService: jasmine.SpyObj<PartyService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddBillToCustomerDialogComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    partyService = jasmine.createSpyObj<PartyService>('PartyService', ['createCustomer']);
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddBillToCustomerDialogComponent>>('MatDialogRef', ['close']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddBillToCustomerDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PartyService, useValue: partyService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TranslateService, useValue: translateService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddBillToCustomerDialogComponent, {
        set: { template: '<form [formGroup]="customerForm"></form>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddBillToCustomerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marks the form touched and skips save when invalid', () => {
    spyOn(component.customerForm, 'markAllAsTouched');

    component.save();

    expect(component.customerForm.markAllAsTouched).toHaveBeenCalled();
    expect(partyService.createCustomer).not.toHaveBeenCalled();
  });

  it('trims values and closes with the created customer on success', () => {
    const createdCustomer = { partyId: 'CUST-100' };
    partyService.createCustomer.and.returnValue(of(createdCustomer));
    component.customerForm.setValue({
      firstName: '  Jane  ',
      lastName: '  Doe  ',
    });

    component.save();

    expect(partyService.createCustomer).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Doe',
      roleTypeId: 'Customer',
    });
    expect(translateService.instant).toHaveBeenCalledWith('SO.CUSTOMER_CREATE_SUCCESS');
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('SO.CUSTOMER_CREATE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(createdCustomer);
    expect(component.isSaving()).toBeFalse();
  });

  it('shows an error and resets saving state when create fails', () => {
    partyService.createCustomer.and.returnValue(throwError(() => new Error('save failed')));
    component.customerForm.setValue({
      firstName: 'Jane',
      lastName: 'Doe',
    });

    component.save();

    expect(translateService.instant).toHaveBeenCalledWith('SO.CUSTOMER_CREATE_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('SO.CUSTOMER_CREATE_ERROR');
    expect(component.isSaving()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
