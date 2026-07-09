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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FeaturegroupsComponent } from './featuregroups.component';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { of, throwError } from 'rxjs';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('FeaturegroupsComponent', () => {
  let component: FeaturegroupsComponent;
  let fixture: ComponentFixture<FeaturegroupsComponent>;
  let featureGroupServiceSpy: jasmine.SpyObj<FeatureGroupService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    featureGroupServiceSpy = jasmine.createSpyObj('FeatureGroupService', ['getFeatureGroups']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showError']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'getParsedResult']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));
    translateServiceSpy.getParsedResult.and.callFake((_translations: unknown, key: string) => key);
    (translateServiceSpy as any).onLangChange = of({ lang: 'en', translations: {} });
    (translateServiceSpy as any).onTranslationChange = of({ lang: 'en', translations: {} });
    (translateServiceSpy as any).onDefaultLangChange = of({ lang: 'en', translations: {} });

    await TestBed.configureTestingModule({
      declarations: [FeaturegroupsComponent],
      providers: [
        { provide: FeatureGroupService, useValue: featureGroupServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FeaturegroupsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch feature groups on init', fakeAsync(() => {
    const mockBody = [{ productFeatureGroupId: 'FG001', description: 'Group 1' }];
    const mockHeaders = new HttpHeaders({ 'x-total-count': '15' });
    const mockResponse = new HttpResponse({ body: mockBody, headers: mockHeaders });

    featureGroupServiceSpy.getFeatureGroups.and.returnValue(of(mockResponse));

    fixture.detectChanges(); // triggers ngOnInit
    tick();

    expect(featureGroupServiceSpy.getFeatureGroups).toHaveBeenCalledWith(0, '');
    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(15);
  }));

  it('should handle error when fetching feature groups fails', fakeAsync(() => {
    featureGroupServiceSpy.getFeatureGroups.and.returnValue(
      throwError(() => new Error('API error'))
    );

    fixture.detectChanges(); // triggers ngOnInit
    tick();

    expect(component.items()).toHaveSize(0);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATUREGROUP.FETCH_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should return correct column keys', () => {
    const result = component.getColumnKeys();
    expect(result).toEqual(['productFeatureGroupId', 'description']);
  });
});
