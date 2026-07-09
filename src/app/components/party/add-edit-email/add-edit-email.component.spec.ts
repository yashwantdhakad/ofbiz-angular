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
import { AddEditEmailComponent } from './add-edit-email.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('AddEditEmailComponent', () => {
  let component: AddEditEmailComponent;
  let fixture: ComponentFixture<AddEditEmailComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddEditEmailComponent>>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  const mockDialogData = {
    addEditEmailData: {
      partyId: 'PARTY_001',
      contactMechId: 'CM001',
      contactMechPurposeId: 'PRIMARY_EMAIL',
      emailAddress: 'test@example.com',
    },
  };

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['addEmail']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      declarations: [AddEditEmailComponent],
      imports: [
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
    fixture = TestBed.createComponent(AddEditEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with injected data', () => {
    expect(component.addEditEmailForm.get('emailAddress')?.value).toBe('test@example.com');
    expect(component.addEditEmailForm.get('partyId')?.value).toBe('PARTY_001');
  });

  it('should call partyService.addEmail on valid form submission', fakeAsync(() => {
    const values = component.addEditEmailForm.value;
    partyServiceSpy.addEmail.and.returnValue(of({}));

    component.addEditEmail();
    tick();

    expect(partyServiceSpy.addEmail).toHaveBeenCalledWith(values);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('PARTY.EMAIL_SAVE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(values);
  }));

  it('should not call addEmail when form is invalid', () => {
    component.addEditEmailForm.patchValue({ emailAddress: '' }); // make invalid
    component.addEditEmail();

    expect(partyServiceSpy.addEmail).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should show error message when addEmail fails', fakeAsync(() => {
    partyServiceSpy.addEmail.and.returnValue(throwError(() => new Error('Service error')));

    component.addEditEmail();
    tick();

    expect(partyServiceSpy.addEmail).toHaveBeenCalled();
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('PARTY.EMAIL_SAVE_ERROR');
  }));
});
