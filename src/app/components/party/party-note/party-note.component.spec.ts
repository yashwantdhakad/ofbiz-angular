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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartyNoteComponent } from './party-note.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

describe('PartyNoteComponent', () => {
  let component: PartyNoteComponent;
  let fixture: ComponentFixture<PartyNoteComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<PartyNoteComponent>>;
  let mockPartyService: jasmine.SpyObj<PartyService>;
  let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockPartyService = jasmine.createSpyObj('PartyService', ['createPartyNote', 'updatePartyNote']);
    mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getUserLoginId']);
    mockAuthService.getUserLoginId.and.returnValue('super_admin');
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [PartyNoteComponent],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: MAT_DIALOG_DATA, useValue: { noteData: { partyId: 'PARTY_1', noteText: 'Initial note' } } },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: PartyService, useValue: mockPartyService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TranslateService, useValue: translateServiceSpy },
      ]
    })
      .overrideTemplate(PartyNoteComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PartyNoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should call createPartyNote on addUpdateNote if noteDate is not present', () => {
    component.addUpdateNoteForm.patchValue({ noteText: 'Test note' });
    mockPartyService.createPartyNote.and.returnValue(of({}));

    component.addUpdateNote();

    expect(mockPartyService.createPartyNote).toHaveBeenCalled();
    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('PARTY.NOTE_SAVE_SUCCESS');
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should call updatePartyNote on addUpdateNote if noteId is present', () => {
    component.addUpdateNoteForm.patchValue({ noteId: 'NOTE_1', noteText: 'Updated note' });
    mockPartyService.updatePartyNote.and.returnValue(of({}));

    component.addUpdateNote();

    expect(mockPartyService.updatePartyNote).toHaveBeenCalled();
    expect(mockSnackbarService.showSuccess).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show error if addUpdateNote fails', () => {
    component.addUpdateNoteForm.patchValue({ noteText: 'Failure case' });
    mockPartyService.createPartyNote.and.returnValue(throwError(() => new Error('Failure')));

    component.addUpdateNote();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('PARTY.NOTE_SAVE_ERROR');
  });

  it('should not call service if form is invalid', () => {
    component.addUpdateNoteForm.patchValue({ noteText: '' });  // Invalid due to required

    component.addUpdateNote();

    expect(mockPartyService.createPartyNote).not.toHaveBeenCalled();
    expect(mockPartyService.updatePartyNote).not.toHaveBeenCalled();
  });
});
