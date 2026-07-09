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
import { CreateFeatureComponent } from './create-feature.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

describe('CreateFeatureComponent', () => {
  let component: CreateFeatureComponent;
  let fixture: ComponentFixture<CreateFeatureComponent>;
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;

  beforeEach(async () => {
    const featureSpy = jasmine.createSpyObj('FeatureService', ['createFeature', 'getProductFeatureTypes']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const routerNavigateSpy = jasmine.createSpyObj('Router', ['navigate']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    renderSchedulerSpy.deferMacrotask.and.callFake((callback: () => void) => callback());

    await TestBed.configureTestingModule({
      declarations: [CreateFeatureComponent],
      imports: [ReactiveFormsModule, FormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: FeatureService, useValue: featureSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: Router, useValue: routerNavigateSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateFeatureComponent);
    component = fixture.componentInstance;
    featureServiceSpy = TestBed.inject(FeatureService) as jasmine.SpyObj<FeatureService>;
    snackbarServiceSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    featureServiceSpy.getProductFeatureTypes.and.returnValue(of([
      { productFeatureTypeId: 'PFT_SAMPLE', description: 'Sample' },
    ]));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load feature types on init', () => {
    expect(component.featureTypes()).toEqual([
      { productFeatureTypeId: 'PFT_SAMPLE', description: 'Sample' },
    ]);
  });

  it('should clear feature types when lookup fails', fakeAsync(() => {
    featureServiceSpy.getProductFeatureTypes.and.returnValue(throwError(() => new Error('Lookup failed')));

    component.ngOnInit();
    tick();

    expect(component.featureTypes()).toEqual([]);
  }));

  it('should mark form as touched if form is invalid on submit', () => {
    component.createFeatureForm.markAsTouched();
    component.createFeature();
    expect(component.createFeatureForm.touched).toBeTrue();
  });

  it('should call createFeature and navigate on success', fakeAsync(() => {
    const mockResponse = { productFeatureId: 'TEST123' };
    component.createFeatureForm.setValue({
      productFeatureTypeId: 'PFT_SAMPLE',
      abbrev: 'SMP',
      description: 'Sample Feature',
    });

    featureServiceSpy.createFeature.and.returnValue(of(mockResponse));

    component.createFeature();
    tick();

    expect(featureServiceSpy.createFeature).toHaveBeenCalled();
    expect(renderSchedulerSpy.deferMacrotask).toHaveBeenCalled();
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('FEATURE.CREATE_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/features/TEST123']);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should show error toast when creation response is missing productFeatureId', fakeAsync(() => {
    component.createFeatureForm.setValue({
      productFeatureTypeId: 'PFT_SAMPLE',
      abbrev: 'SMP',
      description: 'Sample Feature',
    });

    featureServiceSpy.createFeature.and.returnValue(of({}));

    component.createFeature();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATURE.CREATE_ERROR');
  }));

  it('should show error toast on createFeature API error', fakeAsync(() => {
    component.createFeatureForm.setValue({
      productFeatureTypeId: 'PFT_SAMPLE',
      abbrev: 'SMP',
      description: 'Sample Feature',
    });

    featureServiceSpy.createFeature.and.returnValue(throwError(() => new Error('API Error')));

    component.createFeature();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATURE.CREATE_ERROR');
  }));
});
