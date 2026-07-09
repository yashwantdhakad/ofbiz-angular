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
import { EditCustomerComponent } from './edit-customer.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

describe('EditCustomerComponent', () => {
  let component: EditCustomerComponent;
  let fixture: ComponentFixture<EditCustomerComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditCustomerComponent>>;

  const dialogData = {
    customerDetail: {
      partyId: 'PARTY_1',
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['updateCustomer']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      declarations: [EditCustomerComponent],
      providers: [
        FormBuilder,
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditCustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize form', () => {
    expect(component).toBeTruthy();
    expect(component.updateCustomerForm.value.firstName).toBe('John');
    expect(component.updateCustomerForm.valid).toBeTrue();
  });

  it('should call updateCustomer and close dialog on success', fakeAsync(() => {
    partyServiceSpy.updateCustomer.and.returnValue(of({}));

    component.updateCustomer();
    tick(); // Allow observable to complete

    expect(partyServiceSpy.updateCustomer).toHaveBeenCalledWith({
      partyId: 'PARTY_1',
      firstName: 'John',
      lastName: 'Doe'
    });
    expect(dialogRefSpy.close).toHaveBeenCalled();
    expect(snackbarSpy.showSuccess).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should show error message on update failure', () => {
    partyServiceSpy.updateCustomer.and.returnValue(throwError(() => new Error('Failed')));

    component.updateCustomer();

    expect(partyServiceSpy.updateCustomer).toHaveBeenCalled();
    expect(snackbarSpy.showError).toHaveBeenCalled();
  });

  it('should not call service if form is invalid', () => {
    component.updateCustomerForm.controls['firstName'].setValue('');
    component.updateCustomerForm.controls['lastName'].setValue('');

    component.updateCustomer();

    expect(partyServiceSpy.updateCustomer).not.toHaveBeenCalled();
  });
});
