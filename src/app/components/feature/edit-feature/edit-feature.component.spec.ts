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
import { EditFeatureComponent } from './edit-feature.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

describe('EditFeatureComponent', () => {
  let component: EditFeatureComponent;
  let fixture: ComponentFixture<EditFeatureComponent>;
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditFeatureComponent>>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const mockData = {
    featureDetail: {
      productFeatureId: 'TEST123',
      abbrev: 'SMP',
      description: 'Sample Feature'
    }
  };

  beforeEach(async () => {
    featureServiceSpy = jasmine.createSpyObj('FeatureService', ['updateFeature']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [EditFeatureComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: TranslateService, useValue: translateServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .overrideTemplate(EditFeatureComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(EditFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with data', () => {
    expect(component.featureForm.value).toEqual({
      productFeatureId: 'TEST123',
      abbrev: 'SMP',
      description: 'Sample Feature'
    });
  });

  it('should not call updateFeature if form is invalid', () => {
    component.featureForm.controls['abbrev'].setValue('');
    component.updateFeature();
    expect(featureServiceSpy.updateFeature).not.toHaveBeenCalled();
  });

  it('should call updateFeature and close dialog on success', fakeAsync(() => {
    const mockResponse = {};
    featureServiceSpy.updateFeature.and.returnValue(of(mockResponse));

    component.updateFeature();
    tick();

    expect(featureServiceSpy.updateFeature).toHaveBeenCalledWith(component.featureForm.value);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('FEATURE.UPDATE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(component.featureForm.value);
  }));

  it('should show error message on update failure', fakeAsync(() => {
    featureServiceSpy.updateFeature.and.returnValue(throwError(() => new Error('Update failed')));

    component.updateFeature();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATURE.UPDATE_ERROR');
  }));
});
