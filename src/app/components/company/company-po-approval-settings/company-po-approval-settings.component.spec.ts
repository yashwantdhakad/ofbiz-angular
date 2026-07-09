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
import { of, throwError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CompanyPoApprovalSettingsComponent } from './company-po-approval-settings.component';
import { ApiService } from '@ofbiz/services/common/api.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CompanyService } from '@ofbiz/services/company/company.service';

describe('CompanyPoApprovalSettingsComponent', () => {
  let component: CompanyPoApprovalSettingsComponent;
  let fixture: ComponentFixture<CompanyPoApprovalSettingsComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'put']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);

    apiServiceSpy.get.and.returnValue(of({
      enabled: true,
      bands: [{ bandId: 'PO_BAND_1', label: 'Up to 1000', maxAmount: 1000, unlimited: false, sequenceNum: 0 }],
    }));
    apiServiceSpy.put.and.returnValue(of({
      enabled: true,
      bands: [{ bandId: 'PO_BAND_1', label: 'Up to 1000', maxAmount: 1000, unlimited: false, sequenceNum: 0 }],
    }));

    await TestBed.configureTestingModule({
      imports: [CompanyPoApprovalSettingsComponent, TranslateModule.forRoot()],
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
            instant: (key: string) => key,
            get: (key: string) => of(key),
            stream: (key: string) => of(key),
            onLangChange: of({}),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyPoApprovalSettingsComponent);
    component = fixture.componentInstance;
  });

  it('should load po approval policy on init', () => {
    fixture.detectChanges();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/oms/api/purchase-order-approval-policies/COMPANY_1');
    expect(component.poApprovalForm.getRawValue()).toEqual({
      enabled: true,
      bands: [{ bandId: 'PO_BAND_1', label: 'Up to 1000', maxAmount: 1000, unlimited: false, sequenceNum: 0 }],
    });
  });

  it('should update and save po approval policy bands', () => {
    fixture.detectChanges();
    component.poApprovalForm.controls.enabled.setValue(true);
    component.poApprovalBands.clear();

    component.addPoApprovalBand();
    component.poApprovalBands.at(0).patchValue({ label: 'Up to 500', maxAmount: 500 });
    component.addPoApprovalBand();
    component.poApprovalBands.at(1).patchValue({ label: 'Unlimited', unlimited: true, maxAmount: null });
    component.onPoApprovalUnlimitedChange(1);
    component.removePoApprovalBand(0);
    component.savePurchaseOrderApprovalPolicy();

    expect(apiServiceSpy.put).toHaveBeenCalledWith(
      '/oms/api/purchase-order-approval-policies/COMPANY_1',
      {
        enabled: true,
        bands: [{ bandId: 'PO_BAND_2', label: 'Unlimited', maxAmount: null, unlimited: true, sequenceNum: 0 }],
      }
    );
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('COMPANY.PO_APPROVAL_POLICY_SAVE_SUCCESS');
  });

  it('should show backend validation error when policy save fails', () => {
    fixture.detectChanges();
    component.poApprovalForm.controls.enabled.setValue(true);
    component.poApprovalBands.clear();
    component.addPoApprovalBand();
    component.poApprovalBands.at(0).patchValue({ label: 'Needs Approval', maxAmount: 1000, unlimited: false });
    apiServiceSpy.put.and.returnValue(throwError(() => ({ error: { message: 'Approval band label is required' } })));

    component.savePurchaseOrderApprovalPolicy();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Approval band label is required');
  });

  it('should guard invalid index and expose trackBy fallback labels', () => {
    fixture.detectChanges();

    component.removePoApprovalBand(-1);
    component.removePoApprovalBand(99);

    expect(component.poApprovalBands).toHaveSize(1);
    expect(component.trackByPoApprovalBand(0, component.poApprovalBands.at(0))).toBe('PO_BAND_1');

    const fallbackBand = component.poApprovalBands.at(0);
    fallbackBand.controls.bandId.setValue('');
    fallbackBand.controls.label.setValue('Fallback label');

    expect(component.trackByPoApprovalBand(3, fallbackBand)).toBe('Fallback label::3');
  });

  it('should reset to an empty policy when loading fails', () => {
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();

    expect(component.poApprovalForm.getRawValue()).toEqual({
      enabled: false,
      bands: [],
    });
  });

  it('should not save when company party id is missing and should reject invalid finite amounts', () => {
    fixture.detectChanges();
    component.poApprovalForm.controls.enabled.setValue(true);
    component.poApprovalBands.clear();
    component.addPoApprovalBand();
    component.poApprovalBands.at(0).patchValue({ label: 'Band 1', maxAmount: 'bad' as any, unlimited: false });

    expect(component.poApprovalForm.invalid).toBeTrue();

    const companyService = TestBed.inject(CompanyService) as { contextSignal: ReturnType<typeof signal> };
    companyService.contextSignal.set({
      loading: false,
      companyName: 'Test Company',
      companyPartyId: '',
      companyProfile: {},
      companyAddress: null,
      companyLogoUrl: null,
      stores: [],
      facilities: [],
      storeFacilitiesByStoreId: {},
      primaryStore: null,
    } as any);

    component.savePurchaseOrderApprovalPolicy();

    expect(apiServiceSpy.put).not.toHaveBeenCalled();
  });
});
