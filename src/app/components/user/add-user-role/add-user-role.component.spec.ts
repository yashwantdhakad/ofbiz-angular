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
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { UserService } from '@ofbiz/services/security/user.service';
import { TranslateService } from '@ngx-translate/core';
import { AddUserRoleComponent } from './add-user-role.component';

describe('AddUserRoleComponent', () => {
  let component: AddUserRoleComponent;
  let fixture: ComponentFixture<AddUserRoleComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let referenceDataStore: Pick<ReferenceDataStore, 'ensureRolesLoaded' | 'roles'>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddUserRoleComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['updateUser']);
    referenceDataStore = {
      ensureRolesLoaded: jasmine.createSpy('ensureRolesLoaded'),
      roles: signal([
        { groupId: 'APP_SUPER_ADMIN', groupName: 'Super Admin' },
        { groupId: 'ORDER_ADMIN', groupName: 'Order Admin' },
      ]),
    };
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isSuperAdmin']);
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddUserRoleComponent>>('MatDialogRef', ['close']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);
    authService.isSuperAdmin.and.returnValue(false);

    await TestBed.configureTestingModule({
      declarations: [AddUserRoleComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: ReferenceDataStore, useValue: referenceDataStore },
        { provide: AuthService, useValue: authService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: translateService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { userLoginId: 'admin', selectedRoleIds: ['ORDER_ADMIN'] } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddUserRoleComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddUserRoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds selected role ids and loads roles on init', () => {
    expect(component.roleForm.value.roleIds).toEqual(['ORDER_ADMIN']);
    expect(referenceDataStore.ensureRolesLoaded).toHaveBeenCalled();
  });

  it('filters out super admin for non-super-admin users and keeps it for super admins', () => {
    expect(component.roles().map((role: any) => role.groupId)).toEqual(['ORDER_ADMIN']);

    authService.isSuperAdmin.and.returnValue(true);

    expect(component.roles().map((role: any) => role.groupId)).toEqual(['APP_SUPER_ADMIN', 'ORDER_ADMIN']);
  });

  it('marks the form touched and skips save when the form is invalid', () => {
    spyOn(component.roleForm, 'markAllAsTouched');
    component.roleForm.setErrors({ invalid: true });

    component.saveRoles();

    expect(component.roleForm.markAllAsTouched).toHaveBeenCalled();
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('updates the user roles and closes the dialog on success', () => {
    userService.updateUser.and.returnValue(of({} as any));
    component.roleForm.patchValue({ roleIds: ['ORDER_ADMIN'] });

    component.saveRoles();

    expect(userService.updateUser).toHaveBeenCalledWith('admin', { roleIds: ['ORDER_ADMIN'] });
    expect(translateService.instant).toHaveBeenCalledWith('USER.ROLES_UPDATE_SUCCESS');
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('USER.ROLES_UPDATE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.isLoading()).toBeFalse();
  });

  it('shows an error and resets loading when the update fails', () => {
    userService.updateUser.and.returnValue(throwError(() => new Error('update failed')));
    component.roleForm.patchValue({ roleIds: ['ORDER_ADMIN'] });

    component.saveRoles();

    expect(translateService.instant).toHaveBeenCalledWith('USER.ROLES_UPDATE_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('USER.ROLES_UPDATE_ERROR');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });
});
