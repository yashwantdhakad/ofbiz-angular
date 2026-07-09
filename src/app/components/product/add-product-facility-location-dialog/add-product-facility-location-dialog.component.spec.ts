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
import { AddProductFacilityLocationDialogComponent } from './add-product-facility-location-dialog.component';

describe('AddProductFacilityLocationDialogComponent', () => {
  let component: AddProductFacilityLocationDialogComponent;
  let fixture: ComponentFixture<AddProductFacilityLocationDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddProductFacilityLocationDialogComponent>>;
  let facilityService: jasmine.SpyObj<FacilityService>;
  let productFacilityService: jasmine.SpyObj<ProductFacilityService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    facilityService = jasmine.createSpyObj('FacilityService', ['getFacilityLocations']);
    productFacilityService = jasmine.createSpyObj('ProductFacilityService', [
      'createProductFacilityLocation',
      'updateProductFacilityLocation',
    ]);
    snackbar = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translate = jasmine.createSpyObj('TranslateService', ['instant']);
    translate.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddProductFacilityLocationDialogComponent],
      providers: [
        FormBuilder,
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            productId: 'PROD-1',
            facilityId: 'FAC-1',
            facilityName: 'Main Warehouse',
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
      .overrideComponent(AddProductFacilityLocationDialogComponent, { set: { template: '' } })
      .compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(AddProductFacilityLocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads locations from paged responses', () => {
    facilityService.getFacilityLocations.and.returnValue(of({ content: [{ locationSeqId: 'A1' }] } as any));

    createComponent();

    expect(facilityService.getFacilityLocations).toHaveBeenCalledWith('FAC-1', 0, 1000);
    expect(component.locations).toEqual([{ locationSeqId: 'A1' }]);
  });

  it('loads locations from array responses and falls back to empty on invalid responses', () => {
    facilityService.getFacilityLocations.and.returnValues(of([{ locationSeqId: 'B1' }] as any), of({ foo: 'bar' } as any));

    createComponent();
    expect(component.locations).toEqual([{ locationSeqId: 'B1' }]);

    component.loadLocations();
    expect(component.locations).toEqual([]);
  });

  it('shows an error when loading locations fails', () => {
    facilityService.getFacilityLocations.and.returnValue(throwError(() => new Error('load failed')));

    createComponent();

    expect(snackbar.showError).toHaveBeenCalledWith('COMMON.ERROR_LOADING_DATA');
  });

  it('does not save invalid forms', () => {
    facilityService.getFacilityLocations.and.returnValue(of([] as any));
    createComponent();
    component.form.patchValue({ locationSeqId: '' });

    component.save();

    expect(productFacilityService.createProductFacilityLocation).not.toHaveBeenCalled();
  });

  it('creates a facility location and closes with success feedback', () => {
    facilityService.getFacilityLocations.and.returnValue(of([] as any));
    productFacilityService.createProductFacilityLocation.and.returnValue(of({ id: 5 } as any));
    createComponent();
    component.form.patchValue({ locationSeqId: 'A1', minimumStock: '1' });

    component.save();

    expect(productFacilityService.createProductFacilityLocation).toHaveBeenCalledWith(
      jasmine.objectContaining({ productId: 'PROD-1', facilityId: 'FAC-1', locationSeqId: 'A1' })
    );
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 5 });
    expect(snackbar.showSuccess).toHaveBeenCalledWith('COMMON.SAVE_SUCCESS');
    expect(component.isLoading()).toBeFalse();
  });

  it('updates an existing facility location and shows an error on failure', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [AddProductFacilityLocationDialogComponent],
      providers: [
        FormBuilder,
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            productId: 'PROD-1',
            facilityId: 'FAC-1',
            facilityName: 'Main Warehouse',
            productFacilityLocation: { id: 7, locationSeqId: 'OLD' },
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
      .overrideComponent(AddProductFacilityLocationDialogComponent, { set: { template: '' } })
      .compileComponents();

    facilityService.getFacilityLocations.and.returnValue(of([] as any));
    productFacilityService.updateProductFacilityLocation.and.returnValue(throwError(() => new Error('save failed')));

    fixture = TestBed.createComponent(AddProductFacilityLocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.form.patchValue({ locationSeqId: 'NEW' });

    component.save();

    expect(productFacilityService.updateProductFacilityLocation).toHaveBeenCalledWith(
      7,
      jasmine.objectContaining({ productId: 'PROD-1', facilityId: 'FAC-1', locationSeqId: 'NEW' })
    );
    expect(snackbar.showError).toHaveBeenCalledWith('COMMON.SAVE_ERROR');
    expect(component.isLoading()).toBeFalse();
  });

  it('closes without payload when cancelled', () => {
    facilityService.getFacilityLocations.and.returnValue(of([] as any));
    createComponent();

    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
