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
import { AddEditPhoneComponent } from './add-edit-phone.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('AddEditPhoneComponent', () => {
  let component: AddEditPhoneComponent;
  let fixture: ComponentFixture<AddEditPhoneComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddEditPhoneComponent>>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  const mockDialogData = {
    addEditPhoneData: {
      partyId: 'PARTY_001',
      contactMechId: null,
      contactMechPurposeId: 'PRIMARY_PHONE',
      contactNumber: '1234567890',
      areaCode: '022',
      countryCode: '+91',
    },
  };

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['addPhone', 'updatePhoneNumber']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      imports: [
        AddEditPhoneComponent,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEditPhoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with provided dialog data', () => {
    expect(component.addEditPhoneForm.get('contactNumber')?.value).toBe('1234567890');
    expect(component.addEditPhoneForm.valid).toBeTrue();
  });

  it('should call partyService.addPhone when contactMechId is null', fakeAsync(() => {
    const values = component.addEditPhoneForm.value;
    partyServiceSpy.addPhone.and.returnValue(of({}));

    component.addEditPhone();
    tick();

    expect(partyServiceSpy.addPhone).toHaveBeenCalledWith(values);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('PARTY.PHONE_SAVE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(values);
  }));

  it('should call partyService.updatePhoneNumber when contactMechId is provided', fakeAsync(() => {
    component.addEditPhoneForm.patchValue({ contactMechId: 'TCM123' });
    const values = component.addEditPhoneForm.value;
    partyServiceSpy.updatePhoneNumber.and.returnValue(of({}));

    component.addEditPhone();
    tick();

    expect(partyServiceSpy.updatePhoneNumber).toHaveBeenCalledWith(values);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('PARTY.PHONE_SAVE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(values);
  }));

  it('should show error snackbar on service error', fakeAsync(() => {
    partyServiceSpy.addPhone.and.returnValue(throwError(() => new Error('Error')));

    component.addEditPhone();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('PARTY.PHONE_SAVE_ERROR');
  }));

  it('should not submit if form is invalid', () => {
    component.addEditPhoneForm.patchValue({ contactNumber: 'invalid' });
    expect(component.addEditPhoneForm.valid).toBeFalse();

    component.addEditPhone();

    expect(partyServiceSpy.addPhone).not.toHaveBeenCalled();
  });
});
