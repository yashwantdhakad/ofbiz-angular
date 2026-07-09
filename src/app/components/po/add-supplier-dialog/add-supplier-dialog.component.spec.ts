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
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { AddSupplierDialogComponent } from './add-supplier-dialog.component';

describe('AddSupplierDialogComponent', () => {
  let component: AddSupplierDialogComponent;
  let fixture: ComponentFixture<AddSupplierDialogComponent>;
  let partyService: jasmine.SpyObj<PartyService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddSupplierDialogComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    partyService = jasmine.createSpyObj<PartyService>('PartyService', ['createSupplier']);
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddSupplierDialogComponent>>('MatDialogRef', ['close']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddSupplierDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PartyService, useValue: partyService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TranslateService, useValue: translateService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddSupplierDialogComponent, {
        set: { template: '<form [formGroup]="supplierForm"></form>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddSupplierDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marks the form touched and skips save when invalid', () => {
    spyOn(component.supplierForm, 'markAllAsTouched');

    component.save();

    expect(component.supplierForm.markAllAsTouched).toHaveBeenCalled();
    expect(partyService.createSupplier).not.toHaveBeenCalled();
  });

  it('trims values and closes with the created supplier on success', () => {
    const createdSupplier = { partyId: 'SUPP-100' };
    partyService.createSupplier.and.returnValue(of(createdSupplier));
    component.supplierForm.setValue({
      groupName: '  Acme Supplies  ',
      contactNumber: ' 5551234 ',
      emailAddress: 'acme@example.com',
      gstRcmApplicable: false,
      tdsSection195Percent: null,
    });

    component.save();

    expect(partyService.createSupplier).toHaveBeenCalledWith({
      groupName: 'Acme Supplies',
      contactNumber: '5551234',
      emailAddress: 'acme@example.com',
      roleTypeId: 'Supplier',
      gstRcmApplicable: 'N',
      tdsSection195Percent: null,
    });
    expect(translateService.instant).toHaveBeenCalledWith('PO.SUPPLIER_CREATE_SUCCESS');
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('PO.SUPPLIER_CREATE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(createdSupplier);
  });

  it('shows an error and resets saving state when create fails', () => {
    partyService.createSupplier.and.returnValue(throwError(() => new Error('save failed')));
    component.supplierForm.setValue({
      groupName: 'Acme Supplies',
      contactNumber: '',
      emailAddress: '',
      gstRcmApplicable: false,
      tdsSection195Percent: null,
    });

    component.save();

    expect(translateService.instant).toHaveBeenCalledWith('PO.SUPPLIER_CREATE_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('PO.SUPPLIER_CREATE_ERROR');
    expect(component.isSaving()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
