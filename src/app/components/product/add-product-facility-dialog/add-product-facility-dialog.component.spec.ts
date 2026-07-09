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
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { ProductFacilityService } from '@ofbiz/services/product/product-facility.service';
import { AddProductFacilityDialogComponent } from './add-product-facility-dialog.component';

describe('AddProductFacilityDialogComponent', () => {
  let component: AddProductFacilityDialogComponent;
  let fixture: ComponentFixture<AddProductFacilityDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddProductFacilityDialogComponent>>;
  let facilityService: jasmine.SpyObj<FacilityService>;
  let productFacilityService: jasmine.SpyObj<ProductFacilityService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddProductFacilityDialogComponent>>('MatDialogRef', ['close']);
    facilityService = jasmine.createSpyObj<FacilityService>('FacilityService', ['getFacilities']);
    productFacilityService = jasmine.createSpyObj<ProductFacilityService>('ProductFacilityService', [
      'createProductFacility',
      'updateProductFacility',
    ]);
    snackbar = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translate.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddProductFacilityDialogComponent],
      providers: [
        FormBuilder,
        {
          provide: MAT_DIALOG_DATA,
          useValue: { productId: 'PROD-1' },
        },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: FacilityService, useValue: facilityService },
        { provide: ProductFacilityService, useValue: productFacilityService },
        { provide: SnackbarService, useValue: snackbar },
        { provide: TranslateService, useValue: translate },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddProductFacilityDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(AddProductFacilityDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads facilities and falls back to an empty list on invalid responses', () => {
    facilityService.getFacilities.and.returnValues(
      of([{ facilityId: 'FAC-1', facilityName: 'Main' }] as any),
      of({ foo: 'bar' } as any)
    );

    createComponent();
    expect(component.facilities).toEqual([{ facilityId: 'FAC-1', facilityName: 'Main' }]);

    component.loadFacilities();
    expect(component.facilities).toEqual([]);
  });

  it('shows an error when loading facilities fails', () => {
    facilityService.getFacilities.and.returnValue(throwError(() => new Error('load failed')));

    createComponent();

    expect(snackbar.showError).toHaveBeenCalledWith('COMMON.ERROR_LOADING_DATA');
  });

  it('does not save invalid forms', () => {
    facilityService.getFacilities.and.returnValue(of([] as any));
    createComponent();
    spyOn(component.form, 'markAllAsTouched');

    component.save();

    expect(component.form.markAllAsTouched).not.toHaveBeenCalled();
    expect(productFacilityService.createProductFacility).not.toHaveBeenCalled();
    expect(productFacilityService.updateProductFacility).not.toHaveBeenCalled();
  });

  it('creates a facility mapping and shows success feedback', () => {
    facilityService.getFacilities.and.returnValue(of([{ facilityId: 'FAC-1', facilityName: 'Main' }] as any));
    productFacilityService.createProductFacility.and.returnValue(of({ id: 5 } as any));
    createComponent();
    component.form.patchValue({
      facilityId: 'FAC-1',
      minimumStock: '2',
      reorderQuantity: '10',
      daysToShip: '3',
    });

    component.save();

    expect(productFacilityService.createProductFacility).toHaveBeenCalledWith({
      facilityId: 'FAC-1',
      minimumStock: '2',
      reorderQuantity: '10',
      daysToShip: '3',
      productId: 'PROD-1',
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 5 });
    expect(snackbar.showSuccess).toHaveBeenCalledWith('COMMON.SAVE_SUCCESS');
    expect(component.isLoading()).toBeFalse();
  });

  it('shows an error when create fails', () => {
    facilityService.getFacilities.and.returnValue(of([] as any));
    productFacilityService.createProductFacility.and.returnValue(throwError(() => new Error('save failed')));
    createComponent();
    component.form.patchValue({
      facilityId: 'FAC-1',
      minimumStock: '2',
      reorderQuantity: '10',
    });

    component.save();

    expect(snackbar.showError).toHaveBeenCalledWith('COMMON.SAVE_ERROR');
    expect(component.isLoading()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('updates an existing facility mapping and handles update failure', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [AddProductFacilityDialogComponent],
      providers: [
        FormBuilder,
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            productId: 'PROD-1',
            productFacility: { id: 7, facilityId: 'FAC-2', minimumStock: '1', reorderQuantity: '4', daysToShip: '2' },
          },
        },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: FacilityService, useValue: facilityService },
        { provide: ProductFacilityService, useValue: productFacilityService },
        { provide: SnackbarService, useValue: snackbar },
        { provide: TranslateService, useValue: translate },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddProductFacilityDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    facilityService.getFacilities.and.returnValue(of([] as any));
    productFacilityService.updateProductFacility.and.returnValue(of({ id: 7 } as any));

    fixture = TestBed.createComponent(AddProductFacilityDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.form.patchValue({
      facilityId: 'FAC-2',
      minimumStock: '3',
      reorderQuantity: '8',
      daysToShip: '5',
    });

    component.save();

    expect(productFacilityService.updateProductFacility).toHaveBeenCalledWith(7, {
      facilityId: 'FAC-2',
      minimumStock: '3',
      reorderQuantity: '8',
      daysToShip: '5',
      productId: 'PROD-1',
    });
    expect(snackbar.showSuccess).toHaveBeenCalledWith('COMMON.SAVE_SUCCESS');
  });

  it('closes without payload when cancelled', () => {
    facilityService.getFacilities.and.returnValue(of([] as any));
    createComponent();

    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
