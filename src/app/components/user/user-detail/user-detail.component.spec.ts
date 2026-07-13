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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Store } from '@ngrx/store';

import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CompanyService } from '@ofbiz/services/company/company.service';
import { UserService } from '@ofbiz/services/security/user.service';
import { UserDetailComponent } from './user-detail.component';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { AddUserRoleComponent } from '../add-user-role/add-user-role.component';
import { AddUserPermissionComponent } from '../add-user-permission/add-user-permission.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { SetPoApprovalComponent } from '../set-po-approval/set-po-approval.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let companyServiceSpy: jasmine.SpyObj<CompanyService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let storeStub: { select: jasmine.Spy; dispatch: jasmine.Spy };

  const userDetailResponse = {
    userDetail: {
      user: { userLoginId: 'admin', enabled: true },
      roles: [{ groupId: 'ORDER_ADMIN' }, { groupId: 'CATALOG_ADMIN' }],
      permissions: [{ permissionId: 'ORDER_VIEW' }, { permissionId: 'ORDER_EDIT' }],
    }
  };

  beforeEach(() => {
    const routeStub = { params: of({ userLoginId: 'admin' }) };
    const translateSpy = jasmine.createSpyObj(
      'TranslateService',
      ['instant', 'get'],
      {
        onLangChange: of(),
        onDefaultLangChange: of(),
        onTranslationChange: of(),
      }
    );
    translateSpy.instant.and.callFake((key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'USER.LOAD_ERROR': 'Failed to load user',
        'USER.PERMISSION_TITLE': 'Permission',
        'USER.REMOVE_PERMISSION_CONFIRM': `Remove permission ${params?.['permissionId']}?`,
        'USER.PERMISSION_REMOVE_SUCCESS': 'Permission removed successfully',
        'USER.PERMISSION_REMOVE_ERROR': 'Failed to remove permission',
        'USER.COMPANY_CONTEXT_UNAVAILABLE': 'Company context is not available',
        'MENU_TENANT_ONBOARDING': 'MENU_TENANT_ONBOARDING',
      };
      return map[key] ?? key;
    });
    translateSpy.get.and.callFake((key: string | string[]) => of(
      Array.isArray(key)
        ? key.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item]: translateSpy.instant(item) }), {})
        : translateSpy.instant(key)
    ));
    userServiceSpy = jasmine.createSpyObj('UserService', [
      'getUser',
      'updateUser',
      'listGroupPermissions',
      'listPermissions',
      'getPurchaseOrderApprovalAssignment',
      'getPurchaseOrderApprovalPolicy',
      'updatePurchaseOrderApprovalAssignment',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasPermission']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    companyServiceSpy = jasmine.createSpyObj('CompanyService', ['loadContext'], {
      contextSignal: () => ({ companyPartyId: 'COMPANY_1' }),
    });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const partyServiceSpy = jasmine.createSpyObj('PartyService', ['getPartyRolesByPartyId']);
    partyServiceSpy.getPartyRolesByPartyId.and.returnValue(of([]));
    storeStub = {
      select: jasmine.createSpy('select').and.returnValue(of([])),
      dispatch: jasmine.createSpy('dispatch'),
    };

    authServiceSpy.hasPermission.and.returnValue(true);
    userServiceSpy.getUser.and.returnValue(of(userDetailResponse));
    userServiceSpy.updateUser.and.returnValue(of({}));
    userServiceSpy.listGroupPermissions.and.returnValue(of([]));
    userServiceSpy.listPermissions.and.returnValue(of([]));
    userServiceSpy.getPurchaseOrderApprovalAssignment.and.returnValue(of({}));
    userServiceSpy.getPurchaseOrderApprovalPolicy.and.returnValue(of({ enabled: false, bands: [] }));
    userServiceSpy.updatePurchaseOrderApprovalAssignment.and.returnValue(of({}));
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    TestBed.configureTestingModule({
      declarations: [UserDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: UserService, useValue: userServiceSpy },
        { provide: CompanyService, useValue: companyServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: Store, useValue: storeStub },
        { provide: PartyService, useValue: partyServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
  });

  function mockDialogClose(result: any) {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
  }

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load user detail from the route', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(userServiceSpy.getUser).toHaveBeenCalledWith('admin');
    expect(userServiceSpy.getPurchaseOrderApprovalAssignment).toHaveBeenCalledWith('admin', 'COMPANY_1');
    expect(userServiceSpy.getPurchaseOrderApprovalPolicy).toHaveBeenCalledWith('COMPANY_1');
    expect(component.userLoginId).toBe('admin');
    expect(component.userDetail()).toEqual(userDetailResponse.userDetail);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle load user failure by showing an error and redirecting', fakeAsync(() => {
    userServiceSpy.getUser.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Failed to load user');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/users']);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should open edit dialog and refresh silently after update', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    const loadUserSpy = spyOn(component, 'loadUser');
    mockDialogClose(true);

    component.openEditDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(EditUserComponent, {
        data: {
          userLoginId: 'admin',
          user: { userLoginId: 'admin', enabled: true },
        },
      });
    expect(loadUserSpy).toHaveBeenCalledWith(false);
  });

  it('should open role dialog with selected role ids and refresh silently after update', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    const loadUserSpy = spyOn(component, 'loadUser');
    mockDialogClose(true);

    component.openRoleDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(AddUserRoleComponent, {
      data: {
        userLoginId: 'admin',
        selectedRoleIds: ['ORDER_ADMIN', 'CATALOG_ADMIN'],
      },
    });
    expect(loadUserSpy).toHaveBeenCalledWith(false);
  });

  it('should open permission dialog with selected permission ids and refresh silently after update', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    const loadUserSpy = spyOn(component, 'loadUser');
    mockDialogClose(true);

    component.openPermissionDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(AddUserPermissionComponent, {
      data: {
        userLoginId: 'admin',
        selectedPermissionIds: ['ORDER_VIEW', 'ORDER_EDIT'],
        selectedRoleIds: ['ORDER_ADMIN', 'CATALOG_ADMIN'],
      },
    });
    expect(loadUserSpy).toHaveBeenCalledWith(false);
  });

  it('should remove a permission after confirmation and refresh silently', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    const loadUserSpy = spyOn(component, 'loadUser');
    mockDialogClose(true);

    component.removePermission('ORDER_VIEW');

    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      data: {
        title: 'Permission',
        message: 'Remove permission ORDER_VIEW?',
      },
    });
    expect(userServiceSpy.updateUser).toHaveBeenCalledWith('admin', {
      permissionIds: ['ORDER_EDIT'],
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('Permission removed successfully');
    expect(loadUserSpy).toHaveBeenCalledWith(false);
  });

  it('should not remove permission when confirmation is cancelled or permission id is blank', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    mockDialogClose(false);

    component.removePermission('ORDER_VIEW');
    component.removePermission('   ');

    expect(userServiceSpy.updateUser).not.toHaveBeenCalled();
  });

  it('should show an error when permission removal fails', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    userServiceSpy.updateUser.and.returnValue(throwError(() => new Error('update failed')));
    mockDialogClose(true);

    component.removePermission('ORDER_VIEW');

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Failed to remove permission');
  });

  it('should open po approval dialog with company policy context and reload assignments after update', () => {
    component.userLoginId = 'admin';
    component.poApprovalAssignment.set({ bandId: 'PO_BAND_1', label: 'Up to 1000' });
    component.poApprovalPolicy.set({
      enabled: true,
      bands: [{ bandId: 'PO_BAND_1', label: 'Up to 1000', maxAmount: 1000, unlimited: false }],
    });
    const loadContextSpy = spyOn<any>(component, 'loadPurchaseOrderApprovalContext');
    mockDialogClose({ bandId: 'PO_BAND_1' });

    component.openPoApprovalDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(SetPoApprovalComponent, {
      data: {
        userLoginId: 'admin',
        companyPartyId: 'COMPANY_1',
        currentAssignment: { bandId: 'PO_BAND_1', label: 'Up to 1000' },
        policy: {
          enabled: true,
          bands: [{ bandId: 'PO_BAND_1', label: 'Up to 1000', maxAmount: 1000, unlimited: false }],
        },
      },
    });
    expect(loadContextSpy).toHaveBeenCalled();
  });

  it('should show error when opening po approval dialog without company party id', () => {
    component.userLoginId = 'admin';
    Object.defineProperty(companyServiceSpy, 'contextSignal', { value: () => null });

    component.openPoApprovalDialog();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Company context is not available');
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('should remove group role after confirmation and refresh silently', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    const loadUserSpy = spyOn(component, 'loadUser');
    mockDialogClose(true);

    component.removeSecurityGroup('ORDER_ADMIN');

    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      data: {
        title: 'USER.ACCESS_GROUPS',
        message: 'USER.REMOVE_GROUP_CONFIRM',
      },
    });
    expect(userServiceSpy.updateUser).toHaveBeenCalledWith('admin', {
      roleIds: ['CATALOG_ADMIN'],
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('USER.GROUP_REMOVE_SUCCESS');
    expect(loadUserSpy).toHaveBeenCalledWith(false);
  });

  it('should handle failure to remove group role', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    userServiceSpy.updateUser.and.returnValue(throwError(() => new Error('Update failed')));
    mockDialogClose(true);

    component.removeSecurityGroup('ORDER_ADMIN');

    expect(snackbarSpy.showError).toHaveBeenCalledWith('USER.GROUP_REMOVE_ERROR');
  });

  it('should not remove group when confirmation is cancelled or group id is blank', () => {
    component.userLoginId = 'admin';
    component.userDetail.set(userDetailResponse.userDetail);
    mockDialogClose(false);

    component.removeSecurityGroup('ORDER_ADMIN');
    component.removeSecurityGroup(' ');

    expect(userServiceSpy.updateUser).not.toHaveBeenCalled();
  });

  it('should load party roles if user has partyId', () => {
    component.userLoginId = 'admin';
    component.userDetail.set({
      user: { userLoginId: 'admin', enabled: true, partyId: 'PARTY1' },
      roles: [],
      permissions: [],
    } as any);

    component.loadPartyRoles();

    const partySpy = TestBed.inject(PartyService) as jasmine.SpyObj<PartyService>;
    expect(partySpy.getPartyRolesByPartyId).toHaveBeenCalledWith('PARTY1');
    expect(component.partyRoles()).toEqual([]);
  });
});
