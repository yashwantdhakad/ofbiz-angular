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
import { AddIdentificationComponent } from './add-identification.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('AddIdentificationComponent', () => {
  let component: AddIdentificationComponent;
  let fixture: ComponentFixture<AddIdentificationComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddIdentificationComponent>>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  const mockDialogData = {
    identificationData: {
      partyId: 'PARTY_123',
      partyIdTypeEnumId: '',
      idValue: 'ABC123'
    }
  };

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['addIdentification']);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getEnumTypes']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      declarations: [AddIdentificationComponent],
      imports: [
        ReactiveFormsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    commonServiceSpy.getEnumTypes.and.returnValue(of([]));
    fixture = TestBed.createComponent(AddIdentificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with provided data', () => {
    expect(component.addIdentificationForm.value.partyId).toBe('PARTY_123');
    expect(component.addIdentificationForm.value.idValue).toBe('ABC123');
  });

  it('should call getEnumTypes on init', () => {
    const enumTypes = [{ enumId: 'PtidPan', description: 'PAN' }];
    commonServiceSpy.getEnumTypes.and.returnValue(of(enumTypes));
    component.getEnumTypes();
    expect(commonServiceSpy.getEnumTypes).toHaveBeenCalledWith('PartyIdType');
  });

  it('should submit form and call addIdentification', fakeAsync(() => {
    const formValues = component.addIdentificationForm.value;
    partyServiceSpy.addIdentification.and.returnValue(of({}));

    component.addUpdateIdentification();
    tick();

    expect(partyServiceSpy.addIdentification).toHaveBeenCalledWith(formValues);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('PARTY.IDENTIFICATION_SAVE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(formValues);
  }));

  it('should show error message if addIdentification fails', fakeAsync(() => {
    partyServiceSpy.addIdentification.and.returnValue(throwError(() => new Error('API Error')));

    component.addUpdateIdentification();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('PARTY.IDENTIFICATION_SAVE_ERROR');
  }));

  it('should not submit if form is invalid', () => {
    component.addIdentificationForm.get('idValue')?.setValue('');
    component.addUpdateIdentification();

    expect(partyServiceSpy.addIdentification).not.toHaveBeenCalled();
  });
});
