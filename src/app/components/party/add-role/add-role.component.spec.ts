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
import { AddRoleComponent } from './add-role.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('AddRoleComponent', () => {
  let component: AddRoleComponent;
  let fixture: ComponentFixture<AddRoleComponent>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddRoleComponent>>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const mockDialogData = {
    roleData: {
      partyId: 'PARTY_001',
      roleTypeId: 'RoleAdmin'
    }
  };

  beforeEach(async () => {
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['addRole']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    commonServiceSpy.getLookupResults.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [AddRoleComponent],
      imports: [
        ReactiveFormsModule
      ],
      providers: [
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ]
    })
      .overrideComponent(AddRoleComponent, {
        set: { template: '<form [formGroup]="roleForm"></form>' },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddRoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AddRoleComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with provided role data', () => {
    expect(component.roleForm.value.partyId).toBe('PARTY_001');
    expect(component.roleForm.value.roleTypeId).toBe('RoleAdmin');
  });

  it('should call getRoleTypes on init', () => {
    const roleTypes = [{ enumId: 'RoleAdmin', description: 'Administrator' }];
    commonServiceSpy.getLookupResults.and.returnValue(of(roleTypes));
    component.getRoleTypes();
    expect(commonServiceSpy.getLookupResults).toHaveBeenCalledWith({}, 'roletypes');
  });

  it('should call addRole and close dialog on success', fakeAsync(() => {
    const formValues = component.roleForm.value;
    partyServiceSpy.addRole.and.returnValue(of({}));

    component.addRole();
    tick();

    expect(partyServiceSpy.addRole).toHaveBeenCalledWith(formValues);
    expect(translateServiceSpy.instant).toHaveBeenCalledWith('PARTY.ROLE_ADD_SUCCESS');
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('PARTY.ROLE_ADD_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(formValues);
  }));

  it('should show error on addRole failure', fakeAsync(() => {
    partyServiceSpy.addRole.and.returnValue(throwError(() => new Error('API Error')));

    component.addRole();
    tick();

    expect(translateServiceSpy.instant).toHaveBeenCalledWith('PARTY.ROLE_ADD_ERROR');
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('PARTY.ROLE_ADD_ERROR');
  }));

  it('should not call addRole if form is invalid', () => {
    component.roleForm.get('roleTypeId')?.setValue('');
    component.addRole();

    expect(partyServiceSpy.addRole).not.toHaveBeenCalled();
  });
});
