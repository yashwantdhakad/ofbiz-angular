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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { UserService } from '@ofbiz/services/security/user.service';
import { SetPoApprovalComponent } from './set-po-approval.component';

describe('SetPoApprovalComponent', () => {
  let component: SetPoApprovalComponent;
  let fixture: ComponentFixture<SetPoApprovalComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SetPoApprovalComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  async function createComponent(dataOverride?: Partial<{
    userLoginId: string;
    companyPartyId: string;
    currentAssignment: any;
    policy: any;
  }>) {
    userService = jasmine.createSpyObj<UserService>('UserService', ['updatePurchaseOrderApprovalAssignment']);
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<SetPoApprovalComponent>>('MatDialogRef', ['close']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [SetPoApprovalComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: translateService },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            userLoginId: 'admin',
            companyPartyId: 'COMPANY_1',
            currentAssignment: { bandId: 'BAND_1' },
            policy: { enabled: true, bands: [{ bandId: 'BAND_1' }] },
            ...dataOverride,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SetPoApprovalComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SetPoApprovalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('seeds the assignment band and disables the form when policy is off', async () => {
    await createComponent({ policy: { enabled: false, bands: [] } });

    expect(component.form.getRawValue().bandId).toBe('BAND_1');
    expect(component.form.disabled).toBeTrue();
  });

  it('skips save when required identifiers are missing', async () => {
    await createComponent({ userLoginId: '', companyPartyId: '' });

    component.save();

    expect(userService.updatePurchaseOrderApprovalAssignment).not.toHaveBeenCalled();
  });

  it('updates approval assignment and closes on success', async () => {
    await createComponent();
    userService.updatePurchaseOrderApprovalAssignment.and.returnValue(of({ bandId: 'BAND_2' } as any));
    component.form.patchValue({ bandId: 'BAND_2' });

    component.save();

    expect(userService.updatePurchaseOrderApprovalAssignment).toHaveBeenCalledWith('admin', 'COMPANY_1', {
      bandId: 'BAND_2',
    });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('USER.PO_APPROVAL_ASSIGNMENT_UPDATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ bandId: 'BAND_2' });
    expect(component.isLoading).toBeFalse();
  });

  it('shows backend error message when update fails', async () => {
    await createComponent();
    userService.updatePurchaseOrderApprovalAssignment.and.returnValue(
      throwError(() => ({ error: { message: 'Cannot update assignment' } }))
    );

    component.save();

    expect(snackbarService.showError).toHaveBeenCalledWith('Cannot update assignment');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
  });

  it('falls back to translated error when backend message is absent', async () => {
    await createComponent();
    userService.updatePurchaseOrderApprovalAssignment.and.returnValue(throwError(() => new Error('failed')));

    component.save();

    expect(snackbarService.showError).toHaveBeenCalledWith('USER.PO_APPROVAL_ASSIGNMENT_UPDATE_ERROR');
  });
});
