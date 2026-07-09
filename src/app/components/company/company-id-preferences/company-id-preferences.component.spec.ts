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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { throwError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CompanyIdPreferencesComponent } from './company-id-preferences.component';
import { ApiService } from '@ofbiz/services/common/api.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CompanyService } from '@ofbiz/services/company/company.service';

describe('CompanyIdPreferencesComponent', () => {
  let component: CompanyIdPreferencesComponent;
  let fixture: ComponentFixture<CompanyIdPreferencesComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'getWms', 'put', 'putWms']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateService = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);

    apiServiceSpy.get.and.returnValue(of([
      { idType: 'ORDER', nextValue: 10000, scopeType: 'COMPANY', scopeKey: 'COMPANY_1' },
    ]));
    apiServiceSpy.getWms.and.returnValue(of([]));
    apiServiceSpy.put.and.returnValue(of({}));
    apiServiceSpy.putWms.and.returnValue(of({}));
    translateService.instant.and.callFake((key: string, params?: any) => params?.current ? `${key}:${params.current}` : key);
    translateService.get.and.returnValue(of(''));
    translateService.stream.and.returnValue(of(''));

    await TestBed.configureTestingModule({
      imports: [CompanyIdPreferencesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        {
          provide: CompanyService,
          useValue: {
            contextSignal: signal({
              loading: false,
              companyName: 'Test Company',
              companyPartyId: 'COMPANY_1',
              companyProfile: {},
              companyAddress: null,
              companyLogoUrl: null,
              stores: [],
              facilities: [],
              storeFacilitiesByStoreId: {},
              primaryStore: null,
            }),
          },
        },
        {
          provide: TranslateService,
          useValue: {
            ...translateService,
            onLangChange: of({}),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyIdPreferencesComponent);
    component = fixture.componentInstance;
  });

  it('should load company-scoped id preferences on init', () => {
    fixture.detectChanges();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/oms/api/id-generation/preferences');
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/wms/api/id-generation/preferences');
    expect(component.allIdPreferences()).toEqual([
      { idType: 'ORDER', nextValue: 10000, scopeType: 'COMPANY', scopeKey: 'COMPANY_1', service: 'OMS' },
    ]);
  });

  it('should save id preference from the reactive form', () => {
    fixture.detectChanges();
    component.idPreferenceForm.setValue({
      idType: 'ORDER',
      prefix: 'SO-',
      nextValue: 10005,
    });

    component.saveIdPreference();

    expect(apiServiceSpy.put).toHaveBeenCalledWith('/oms/api/id-generation/preferences', {
      idType: 'ORDER',
      prefix: 'SO-',
      nextValue: 10005,
      scopeType: 'COMPANY',
      scopeKey: 'COMPANY_1',
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('COMPANY.ID_PREFERENCE_SAVED');
  });

  it('should save wms id preference through the WMS endpoint', () => {
    fixture.detectChanges();
    component.idPreferenceForm.setValue({
      idType: 'PICKLIST',
      prefix: 'PK-',
      nextValue: 20001,
    });

    component.saveIdPreference();

    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/wms/api/id-generation/preferences', {
      idType: 'PICKLIST',
      prefix: 'PK-',
      nextValue: 20001,
      scopeType: 'COMPANY',
      scopeKey: 'COMPANY_1',
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('COMPANY.ID_PREFERENCE_SAVED');
  });

  it('should block invalid form submission before saving', () => {
    fixture.detectChanges();
    component.idPreferenceForm.setValue({
      idType: '',
      prefix: '',
      nextValue: 0,
    });

    component.saveIdPreference();

    expect(component.idPreferenceForm.touched).toBeTrue();
    expect(apiServiceSpy.put).not.toHaveBeenCalled();
    expect(apiServiceSpy.putWms).not.toHaveBeenCalled();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('COMPANY.ID_PREFERENCE_INVALID');
  });

  it('should reject invalid payloads built outside the form guard', () => {
    fixture.detectChanges();

    const result = (component as any).buildPreferencePayload({
      idType: 'ORDER',
      prefix: 'SO-',
      nextValue: Number.NaN,
    });

    expect(result).toBeNull();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('COMPANY.ID_PREFERENCE_INVALID');
  });

  it('should block decreasing the next value below the current company preference', () => {
    fixture.detectChanges();
    component.idPreferenceForm.setValue({
      idType: 'ORDER',
      prefix: 'SO-',
      nextValue: 9999,
    });

    component.saveIdPreference();

    expect(apiServiceSpy.put).not.toHaveBeenCalled();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('COMPANY.ID_PREFERENCE_CANNOT_DECREASE:10000');
  });

  it('should reset preferences when loading falls back to empty results', () => {
    fixture.detectChanges();
    component.omsIdPreferences.set([{ idType: 'ORDER', nextValue: 99999, scopeType: 'COMPANY', scopeKey: 'COMPANY_1' }]);
    component.wmsIdPreferences.set([{ idType: 'PICKLIST', nextValue: 88888, scopeType: 'COMPANY', scopeKey: 'COMPANY_1' }]);
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('load failed')));
    apiServiceSpy.getWms.and.returnValue(throwError(() => new Error('load failed')));

    (component as any).loadIdPreferences();

    expect(component.idPreferencesLoading).toBeFalse();
    expect(component.omsIdPreferences()).toEqual([]);
    expect(component.wmsIdPreferences()).toEqual([]);
  });

  it('should track id preference rows by id type prefix and value', () => {
    expect(component.trackByIdPreference(2, { idType: 'ORDER', prefix: 'SO-', nextValue: 10001 })).toBe('ORDER::SO-::10001');
    expect(component.trackByIdPreference(4, {} as any)).toBe('::::4');
  });
});
