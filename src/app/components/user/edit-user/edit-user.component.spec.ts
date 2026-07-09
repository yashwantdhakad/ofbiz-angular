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
import { EditUserComponent } from './edit-user.component';

describe('EditUserComponent', () => {
  let component: EditUserComponent;
  let fixture: ComponentFixture<EditUserComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EditUserComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['updateUser']);
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<EditUserComponent>>('MatDialogRef', ['close']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [EditUserComponent],
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
            user: {
              firstName: 'Ada',
              lastName: 'Lovelace',
              enabled: true,
              requirePasswordChange: false,
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(EditUserComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EditUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the form from dialog data', () => {
    expect(component.userForm.getRawValue()).toEqual({
      userLoginId: 'admin',
      password: '',
      firstName: 'Ada',
      lastName: 'Lovelace',
      enabled: true,
      requirePasswordChange: false,
    });
  });

  it('marks the form touched and skips save when invalid', () => {
    spyOn(component.userForm, 'markAllAsTouched');
    component.userForm.setErrors({ invalid: true });

    component.updateUser();

    expect(component.userForm.markAllAsTouched).toHaveBeenCalled();
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('removes empty passwords and closes on success', () => {
    userService.updateUser.and.returnValue(of({} as any));

    component.updateUser();

    expect(userService.updateUser).toHaveBeenCalledWith('admin', {
      firstName: 'Ada',
      lastName: 'Lovelace',
      enabled: true,
      requirePasswordChange: false,
    });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('USER.UPDATE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.isLoading()).toBeFalse();
  });

  it('keeps password in payload when present and shows error on failure', () => {
    userService.updateUser.and.returnValue(throwError(() => new Error('update failed')));
    component.userForm.patchValue({ password: 'secret' });

    component.updateUser();

    expect(userService.updateUser).toHaveBeenCalledWith('admin', {
      password: 'secret',
      firstName: 'Ada',
      lastName: 'Lovelace',
      enabled: true,
      requirePasswordChange: false,
    });
    expect(snackbarService.showError).toHaveBeenCalledWith('USER.UPDATE_ERROR');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });
});
