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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';

import { CompanyComponent } from './company.component';
import { ApiService } from '@ofbiz/services/common/api.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CompanyService } from '@ofbiz/services/company/company.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

describe('CompanyComponent', () => {
  let fixture: ComponentFixture<CompanyComponent>;
  let component: CompanyComponent;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let companyServiceSpy: jasmine.SpyObj<CompanyService>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let translateSpy: any;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'getWms', 'put', 'putWms']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['createPartyContent']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    companyServiceSpy = jasmine.createSpyObj('CompanyService', ['loadContext', 'refreshContext', 'uploadCompanyLogo', 'updateCompanyName'], {
      contextSignal: () => ({
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
    });

    apiServiceSpy.get.and.callFake((url: string): any => {
      if (url.includes('/purchase-order-approval-policies/')) {
        return of({
          enabled: true,
          bands: [{ bandId: 'PO_BAND_1', label: 'Up to 1000', maxAmount: 1000, unlimited: false, sequenceNum: 0 }],
        });
      }
      return of([]);
    });
    apiServiceSpy.getWms.and.returnValue(of([]));
    apiServiceSpy.put.and.returnValue(of({
      enabled: true,
      bands: [{ bandId: 'PO_BAND_1', label: 'Up to 1000', maxAmount: 1000, unlimited: false, sequenceNum: 0 }],
    }));
    apiServiceSpy.putWms.and.returnValue(of({}));
    partyServiceSpy.createPartyContent.and.returnValue(of({}));
    companyServiceSpy.uploadCompanyLogo.and.returnValue(of({}));
    companyServiceSpy.updateCompanyName.and.returnValue(of({}));
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    translateSpy = {
      instant: (key: string) => key,
      get: (key: string) => of(key),
      stream: (key: string) => of(key),
      onLangChange: of({}),
      onTranslationChange: of({}),
      onDefaultLangChange: of({}),
    };

    await TestBed.configureTestingModule({
      declarations: [CompanyComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: CompanyService, useValue: companyServiceSpy },
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyComponent);
    component = fixture.componentInstance;
  });

  it('should load po approval policy on init', () => {
    fixture.detectChanges();

    expect(companyServiceSpy.loadContext).toHaveBeenCalled();
    expect(apiServiceSpy.get).not.toHaveBeenCalledWith('/oms/api/purchase-order-approval-policies/COMPANY_1');
  });

  it('derives loading and address display state from the context signal', () => {
    expect(component.isLoading()).toBeFalse();
    expect(component.companyAddressLine()).toBe('--');
    expect(component.hasCompanyAddress()).toBeFalse();
  });

  it('stores the selected logo file from the file input event', () => {
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    const event = {
      target: {
        files: [file],
      },
    } as unknown as Event;

    component.onLogoFileSelected(event);

    expect(component.selectedLogoFile()).toBe(file);
  });

  it('shows an error when uploadLogo is called without a file', () => {
    component.uploadLogo();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('COMPANY.LOGO_SELECT_REQUIRED');
    expect(companyServiceSpy.uploadCompanyLogo).not.toHaveBeenCalled();
  });

  it('uploads the company logo and refreshes the context on success', () => {
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    component.selectedLogoFile.set(file);

    spyOn(window, 'FileReader').and.returnValue({
      result: null,
      readAsDataURL: function(_f: File) {
        this.result = 'data:image/png;base64,abc123';
        this.onload({ target: { result: this.result } } as any);
      },
      onload: null
    } as any);

    component.uploadLogo();

    expect(companyServiceSpy.uploadCompanyLogo).toHaveBeenCalledWith('COMPANY_1', 'abc123', 'image/png', 'logo.png');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('COMPANY.LOGO_UPLOAD_SUCCESS');
    expect(companyServiceSpy.refreshContext).toHaveBeenCalled();
    expect(component.selectedLogoFile()).toBeNull();
  });

  it('formats addresses and detects when an address is present', () => {
    expect(component.getAddressLine(null)).toBe('--');
    expect(component.getAddressLine({
      toName: 'Acme',
      address1: '123 Main',
      city: 'Pune',
      postalCode: '411001',
      countryGeoId: 'IND',
    } as any)).toBe('Acme, 123 Main, Pune, 411001, IND');
  });

  it('opens the company address dialog and refreshes on save', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ saved: true }) } as any);

    component.openCompanyAddressDialog();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(companyServiceSpy.refreshContext).toHaveBeenCalled();
  });

  it('opens the company name dialog and saves on close if name changed', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of('Updated Test Company') } as any);

    component.startEditName();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(companyServiceSpy.updateCompanyName).toHaveBeenCalledWith('COMPANY_1', 'Updated Test Company');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('COMPANY.NAME_UPDATE_SUCCESS');
    expect(companyServiceSpy.refreshContext).toHaveBeenCalled();
  });

  it('hides the id preference and purchase approval sections for now', () => {
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).not.toContain('COMPANY.ID_PREFERENCES');
    expect(nativeElement.textContent).not.toContain('COMPANY.PO_APPROVAL_POLICY_TITLE');
  });
});
