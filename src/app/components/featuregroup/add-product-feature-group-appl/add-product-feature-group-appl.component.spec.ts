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
import { AddProductFeatureGroupApplComponent } from './add-product-feature-group-appl.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { HttpResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

describe('AddProductFeatureGroupApplComponent', () => {
  let component: AddProductFeatureGroupApplComponent;
  let fixture: ComponentFixture<AddProductFeatureGroupApplComponent>;
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let featureGroupServiceSpy: jasmine.SpyObj<FeatureGroupService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    featureServiceSpy = jasmine.createSpyObj('FeatureService', ['getFeatures']);
    featureGroupServiceSpy = jasmine.createSpyObj('FeatureGroupService', [
      'createProductFeatureGroupAppl',
      'updateProductFeatureGroupAppl',
    ]);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [AddProductFeatureGroupApplComponent],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: MAT_DIALOG_DATA, useValue: { featureGroupProductData: {} } },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: FeatureGroupService, useValue: featureGroupServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    })
      .overrideTemplate(AddProductFeatureGroupApplComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(AddProductFeatureGroupApplComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call getFeatures and return feature list', fakeAsync(() => {
    const mockResponse = new HttpResponse({
      body: [{ id: 'F001' }],
      status: 200,
      statusText: 'OK',
    });
    featureServiceSpy.getFeatures.and.returnValue(of(mockResponse));
    component.getFeatures('feature').subscribe((res) => {
      expect(res).toHaveSize(1);
      expect(res[0].id).toBe('F001');
    });
    tick();
  }));

  it('should show an error and return empty feature list when lookup fails', fakeAsync(() => {
    let result: any[] | undefined;
    featureServiceSpy.getFeatures.and.returnValue(throwError(() => new Error('Lookup failed')));

    component.getFeatures('feature').subscribe((res) => {
      result = res;
    });
    tick();

    expect(result).toEqual([]);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATURE.FETCH_ERROR');
  }));

  it('should submit form and call create service', fakeAsync(() => {
    const formValue = {
      id: null,
      productFeatureId: 'F001',
      productFeatureGroupId: 'G001',
      fromDate: null,
    };
    component.productFeatureGroupApplForm.setValue(formValue);
    featureGroupServiceSpy.createProductFeatureGroupAppl.and.returnValue(of({}));

    component.createProductFeatGrpAppl();
    tick();

    expect(featureGroupServiceSpy.createProductFeatureGroupAppl).toHaveBeenCalledWith(formValue);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith(
      'FEATUREGROUP.APPLICATION_CREATE_SUCCESS'
    );
    expect(component.isLoading()).toBeFalse();
  }));

  it('should submit form and call update service when fromDate is present', fakeAsync(() => {
    const formValue = {
      id: 1,
      productFeatureId: 'F001',
      productFeatureGroupId: 'G001',
      fromDate: '2024-01-01',
    };
    component.productFeatureGroupApplForm.setValue(formValue);
    featureGroupServiceSpy.updateProductFeatureGroupAppl.and.returnValue(of({}));

    component.createProductFeatGrpAppl();
    tick();

    expect(featureGroupServiceSpy.updateProductFeatureGroupAppl).toHaveBeenCalledWith(formValue);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith(
      'FEATUREGROUP.APPLICATION_UPDATE_SUCCESS'
    );
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error in createProductFeatGrpAppl', fakeAsync(() => {
    component.productFeatureGroupApplForm.setValue({
      id: null,
      productFeatureId: 'F001',
      productFeatureGroupId: 'G001',
      fromDate: null,
    });
    featureGroupServiceSpy.createProductFeatureGroupAppl.and.returnValue(
      throwError(() => new Error('Failed'))
    );

    component.createProductFeatGrpAppl();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith(
      'FEATUREGROUP.APPLICATION_SAVE_ERROR'
    );
    expect(component.isLoading()).toBeFalse();
  }));

  it('should return empty feature list when query is blank and format display values', fakeAsync(() => {
    let result: any[] | undefined;

    component.getFeatures('').subscribe((res) => {
      result = res;
    });
    tick();

    expect(result).toEqual([]);
    expect(featureServiceSpy.getFeatures).not.toHaveBeenCalled();
    expect(component.displayFeature(null)).toBe('');
    expect(component.displayFeature('FEATURE_A')).toBe('FEATURE_A');
    expect(component.displayFeature({ description: 'Desc', abbrev: 'AB', productFeatureId: 'PF1' })).toBe('Desc');
    expect(component.displayFeature({ abbrev: 'AB', productFeatureId: 'PF1' })).toBe('AB');
    expect(component.displayFeature({ productFeatureId: 'PF1' })).toBe('PF1');
  }));

  it('should not submit when form is invalid', () => {
    component.productFeatureGroupApplForm.patchValue({
      productFeatureId: null,
    });

    component.createProductFeatGrpAppl();

    expect(featureGroupServiceSpy.createProductFeatureGroupAppl).not.toHaveBeenCalled();
    expect(featureGroupServiceSpy.updateProductFeatureGroupAppl).not.toHaveBeenCalled();
  });
});
