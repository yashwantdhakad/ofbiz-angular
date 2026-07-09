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
import { AddToFeatureGroupComponent } from './add-to-feature-group.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { of, throwError } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpHeaders, HttpResponse, provideHttpClient } from '@angular/common/http';

describe('AddToFeatureGroupComponent', () => {
  let component: AddToFeatureGroupComponent;
  let fixture: ComponentFixture<AddToFeatureGroupComponent>;
  let featureGroupServiceSpy: jasmine.SpyObj<FeatureGroupService>;
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddToFeatureGroupComponent>>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const dialogData = {
    featureGroupData: {
      productFeatureId: 'F001',
      productFeatureGroupId: 'FG001',
      sequenceNum: 10,
      fromDate: null,
      isNew: true
    }
  };

  beforeEach(async () => {
    featureGroupServiceSpy = jasmine.createSpyObj('FeatureGroupService', ['getFeatureGroups']);
    featureServiceSpy = jasmine.createSpyObj('FeatureService', ['createProductFeatureGroupAppl', 'updateProductFeatureGroupAppl']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule],
      declarations: [AddToFeatureGroupComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: FeatureGroupService, useValue: featureGroupServiceSpy },
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    })
      .overrideTemplate(AddToFeatureGroupComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(AddToFeatureGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize the form', () => {
    expect(component).toBeTruthy();
    expect(component.createProductFeatureGroupApplForm.valid).toBeTrue();
  });

  it('should call createProductFeatureGroupAppl on valid form (create)', fakeAsync(() => {
    featureServiceSpy.createProductFeatureGroupAppl.and.returnValue(of({}));

    component.createProductFeatureGroupAppl();
    tick();

    expect(featureServiceSpy.createProductFeatureGroupAppl).toHaveBeenCalledWith(
      jasmine.objectContaining({
        productFeatureId: 'F001',
        productFeatureGroupId: 'FG001',
        sequenceNum: 10,
        fromDate: null,
      })
    );
    expect(dialogRefSpy.close).toHaveBeenCalled();
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('FEATUREGROUP.APPLICATION_CREATE_SUCCESS');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should call updateProductFeatureGroupAppl on valid form with fromDate', fakeAsync(() => {
    const form = component.createProductFeatureGroupApplForm;
    form.patchValue({ id: 'ID-1', fromDate: '2023-01-01' });

    featureServiceSpy.updateProductFeatureGroupAppl.and.returnValue(of({}));

    component.createProductFeatureGroupAppl();
    tick();

    expect(featureServiceSpy.updateProductFeatureGroupAppl).toHaveBeenCalled();
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('FEATUREGROUP.APPLICATION_UPDATE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should show error message when API fails', fakeAsync(() => {
    featureServiceSpy.createProductFeatureGroupAppl.and.returnValue(throwError(() => new Error('API error')));

    component.createProductFeatureGroupAppl();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('FEATUREGROUP.APPLICATION_SAVE_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should not call service if form is invalid', () => {
    component.createProductFeatureGroupApplForm.controls['productFeatureGroupId'].setValue('');

    component.createProductFeatureGroupAppl();

    expect(featureServiceSpy.createProductFeatureGroupAppl).not.toHaveBeenCalled();
    expect(featureServiceSpy.updateProductFeatureGroupAppl).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should return display labels for string, object, and empty group values', () => {
    expect(component.displayGroup(null)).toBe('');
    expect(component.displayGroup('FG001')).toBe('FG001');
    expect(component.displayGroup({ description: 'Group 1', productFeatureGroupId: 'FG001' })).toBe('Group 1');
    expect(component.displayGroup({ productFeatureGroupId: 'FG002' })).toBe('FG002');
  });

  it('should return an empty list when the feature-group query is blank', fakeAsync(() => {
    component.ngOnInit();

    let latestGroups: any[] | undefined;
    component.filteredGroups$.subscribe((groups) => {
      latestGroups = groups;
    });

    component.createProductFeatureGroupApplForm.get('productFeatureGroupId')?.setValue('');
    tick(301);

    expect(featureGroupServiceSpy.getFeatureGroups).not.toHaveBeenCalled();
    expect(latestGroups).toEqual([]);
  }));

  it('should filter feature groups when productFeatureGroupId changes', fakeAsync(() => {
    // const mockFeatureGroups = { body: [{ id: 'FG001' }, { id: 'FG002' }] };
    const mockFeatureGroups = new HttpResponse({
      body: [{ id: 'FG001' }, { id: 'FG002' }],
      headers: new HttpHeaders({ 'x-total-count': '2' }),
      status: 200,
      statusText: 'OK',
      url: '/api/rest/s1/commerce/featureGroups',
    });
    featureGroupServiceSpy.getFeatureGroups.and.returnValue(of(mockFeatureGroups));

    component.ngOnInit();
    component.filteredGroups$.subscribe(groups => {
      if (groups.length) {
        expect(groups).toHaveSize(2);
      }
    });
    component.createProductFeatureGroupApplForm.get('productFeatureGroupId')?.setValue('FG');
    tick(301); // simulate debounce
  }));

  it('should show an error and return empty feature group list when lookup fails', fakeAsync(() => {
    let latestGroups: any[] | undefined;
    featureGroupServiceSpy.getFeatureGroups.and.returnValue(throwError(() => new Error('Lookup failed')));

    component.ngOnInit();
    component.filteredGroups$.subscribe((groups) => {
      latestGroups = groups;
    });
    component.createProductFeatureGroupApplForm.get('productFeatureGroupId')?.setValue('FG');
    tick(301);

    expect(latestGroups).toEqual([]);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('FEATUREGROUP.FETCH_ERROR');
  }));
});
