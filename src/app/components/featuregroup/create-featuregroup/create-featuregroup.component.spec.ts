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
import { CreateFeaturegroupComponent } from './create-featuregroup.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('CreateFeaturegroupComponent', () => {
  let component: CreateFeaturegroupComponent;
  let fixture: ComponentFixture<CreateFeaturegroupComponent>;
  let featureGroupServiceSpy: jasmine.SpyObj<FeatureGroupService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    featureGroupServiceSpy = jasmine.createSpyObj('FeatureGroupService', ['createFeatureGroup']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule],
      declarations: [CreateFeaturegroupComponent],
      providers: [
        { provide: FeatureGroupService, useValue: featureGroupServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ]
    })
      .overrideTemplate(CreateFeaturegroupComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(CreateFeaturegroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should mark form as touched if invalid', () => {
    component.createFeatureGroupForm.controls['description'].setValue('');
    component.createFeatureGroup();

    expect(component.createFeatureGroupForm.touched).toBeTrue();
    expect(component.createFeatureGroupForm.invalid).toBeTrue();
  });

  it('should call createFeatureGroup and navigate on success', fakeAsync(() => {
    const mockResponse = { productFeatureGroupId: 'FG001' };
    featureGroupServiceSpy.createFeatureGroup.and.returnValue(of(mockResponse));

    component.createFeatureGroupForm.controls['description'].setValue('Test Group');
    component.createFeatureGroup();
    tick();

    expect(featureGroupServiceSpy.createFeatureGroup).toHaveBeenCalledWith({
      description: 'Test Group',
    });
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('FEATUREGROUP.CREATE_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/featuregroups/FG001']);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should show error message if response does not contain ID', fakeAsync(() => {
    featureGroupServiceSpy.createFeatureGroup.and.returnValue(of({}));

    component.createFeatureGroupForm.controls['description'].setValue('No ID Group');
    component.createFeatureGroup();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATUREGROUP.CREATE_MISSING_ID');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should show error message on service failure', fakeAsync(() => {
    featureGroupServiceSpy.createFeatureGroup.and.returnValue(
      throwError(() => new Error('Server error'))
    );

    component.createFeatureGroupForm.controls['description'].setValue('Error Group');
    component.createFeatureGroup();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATUREGROUP.CREATE_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));
});
