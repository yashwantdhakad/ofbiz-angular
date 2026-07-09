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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { UserService } from '@ofbiz/services/security/user.service';
import { TranslateService } from '@ngx-translate/core';
import { AddUserPermissionComponent } from './add-user-permission.component';

describe('AddUserPermissionComponent', () => {
  let component: AddUserPermissionComponent;
  let fixture: ComponentFixture<AddUserPermissionComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let referenceDataStore: Pick<ReferenceDataStore, 'ensurePermissionsLoaded' | 'permissions'>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddUserPermissionComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['updateUser']);
    referenceDataStore = {
      ensurePermissionsLoaded: jasmine.createSpy('ensurePermissionsLoaded'),
      permissions: signal([
        { permissionId: 'ORDER_VIEW', description: 'View Orders' },
        { permissionId: 'MENU_ADMIN', description: 'Admin Menu' },
      ]),
    };
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddUserPermissionComponent>>('MatDialogRef', ['close']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddUserPermissionComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: ReferenceDataStore, useValue: referenceDataStore },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: translateService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { userLoginId: 'admin', selectedPermissionIds: ['MENU_ADMIN'] } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddUserPermissionComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddUserPermissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds selected permission ids and loads permissions on init', () => {
    expect(component.permissionForm.value.permissionIds).toEqual(['MENU_ADMIN']);
    expect(referenceDataStore.ensurePermissionsLoaded).toHaveBeenCalled();
  });

  it('exposes the shared permission signal from the store', () => {
    expect(component.permissions()).toEqual([
      { permissionId: 'ORDER_VIEW', description: 'View Orders' },
      { permissionId: 'MENU_ADMIN', description: 'Admin Menu' },
    ]);
  });

  it('marks the form touched and skips save when the form is invalid', () => {
    spyOn(component.permissionForm, 'markAllAsTouched');
    component.permissionForm.setErrors({ invalid: true });

    component.savePermissions();

    expect(component.permissionForm.markAllAsTouched).toHaveBeenCalled();
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('updates permissions and closes the dialog on success', () => {
    userService.updateUser.and.returnValue(of({} as any));
    component.permissionForm.patchValue({ permissionIds: ['MENU_ADMIN'] });

    component.savePermissions();

    expect(userService.updateUser).toHaveBeenCalledWith('admin', { permissionIds: ['MENU_ADMIN'] });
    expect(translateService.instant).toHaveBeenCalledWith('USER.PERMISSIONS_UPDATE_SUCCESS');
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('USER.PERMISSIONS_UPDATE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.isLoading()).toBeFalse();
  });

  it('shows an error and resets loading when the update fails', () => {
    userService.updateUser.and.returnValue(throwError(() => new Error('update failed')));
    component.permissionForm.patchValue({ permissionIds: ['MENU_ADMIN'] });

    component.savePermissions();

    expect(translateService.instant).toHaveBeenCalledWith('USER.PERMISSIONS_UPDATE_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('USER.PERMISSIONS_UPDATE_ERROR');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('loads group permissions and maps them when selectedRoleIds are provided', fakeAsync(() => {
    const listSpy = jasmine.createSpy('listGroupPermissions').and.returnValue(of([
      { groupId: 'ROLE_1', permissionId: 'PERM_ROLE_1' },
      { groupId: 'ROLE_2', permissionId: 'PERM_ROLE_2' },
    ]));
    (userService as any).listGroupPermissions = listSpy;

    component.data = {
      userLoginId: 'admin',
      selectedPermissionIds: ['MENU_ADMIN'],
      selectedRoleIds: ['ROLE_1'],
    };

    component.ngOnInit();
    tick();

    expect(listSpy).toHaveBeenCalled();
    expect(component.permissionForm.value.permissionIds).toEqual(['MENU_ADMIN', 'PERM_ROLE_1']);
    expect(component.isLoading()).toBeFalse();
  }));

  it('handles error gracefully when listGroupPermissions fails', fakeAsync(() => {
    const listSpy = jasmine.createSpy('listGroupPermissions').and.returnValue(throwError(() => new Error('API Error')));
    (userService as any).listGroupPermissions = listSpy;

    component.data = {
      userLoginId: 'admin',
      selectedPermissionIds: ['MENU_ADMIN'],
      selectedRoleIds: ['ROLE_1'],
    };

    component.ngOnInit();
    tick();

    expect(listSpy).toHaveBeenCalled();
    expect(component.permissionForm.value.permissionIds).toEqual(['MENU_ADMIN']);
    expect(component.isLoading()).toBeFalse();
  }));
});
