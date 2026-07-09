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
import { FeaturesComponent } from './features.component';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { of, throwError } from 'rxjs';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

describe('FeaturesComponent', () => {
  let component: FeaturesComponent;
  let fixture: ComponentFixture<FeaturesComponent>;
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    featureServiceSpy = jasmine.createSpyObj('FeatureService', ['getFeatures']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showError']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'getParsedResult']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));
    translateServiceSpy.getParsedResult.and.callFake((_translations: unknown, key: string) => key);
    (translateServiceSpy as any).onLangChange = of({ lang: 'en', translations: {} });
    (translateServiceSpy as any).onTranslationChange = of({ lang: 'en', translations: {} });
    (translateServiceSpy as any).onDefaultLangChange = of({ lang: 'en', translations: {} });

    await TestBed.configureTestingModule({
      declarations: [FeaturesComponent],
      providers: [
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FeaturesComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch features on init', fakeAsync(() => {
    const mockData = [{ productFeatureId: 'F1', description: 'Test', abbrev: 'T1', productFeatureTypeId: 'TYPE1' }];
    const headers = new HttpHeaders({ 'x-total-count': '1' });
    const mockResponse = new HttpResponse({ body: mockData, headers });

    featureServiceSpy.getFeatures.and.returnValue(of(mockResponse));

    fixture.detectChanges(); // triggers ngOnInit
    tick();

    expect(featureServiceSpy.getFeatures).toHaveBeenCalledWith(0, '');
    expect(component.items()).toEqual(mockData);
    expect(component.pages()).toBe(1);
  }));

  it('should use body total fallback when x-total-count header is unavailable', fakeAsync(() => {
    const mockBody = { resultList: [{ productFeatureId: 'F1' }], documentListCount: 25 };
    const mockResponse = new HttpResponse({ body: mockBody, headers: new HttpHeaders() });

    featureServiceSpy.getFeatures.and.returnValue(of(mockResponse as any));

    fixture.detectChanges();
    tick();

    expect(component.items()).toEqual(mockBody.resultList);
    expect(component.pages()).toBe(25);
  }));

  it('should show error message on fetch failure', fakeAsync(() => {
    featureServiceSpy.getFeatures.and.returnValue(throwError(() => new Error('Failed')));
    fixture.detectChanges();
    tick();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('FEATURE.FETCH_ERROR');
    expect(component.items()).toHaveSize(0);
    expect(component.pages()).toBe(0);
  }));

  it('getValue should return nested value', () => {
    const item = { details: { name: 'Feature Name' } };
    const result = component.getValue(item, 'details.name');
    expect(result).toBe('Feature Name');
  });

  it('getValue should return undefined if path is invalid', () => {
    const item = {};
    const result = component.getValue(item, 'details.name');
    expect(result).toBeUndefined();
  });

  it('getColumnKeys should return displayed column keys', () => {
    const keys = component.getColumnKeys();
    expect(keys).toEqual(['productFeatureId', 'description', 'abbrev', 'productFeatureTypeId']);
  });
});
