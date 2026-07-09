import { provideRouter } from '@angular/router';
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
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { CompanyService } from '@ofbiz/services/company/company.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { ProductFacilityService } from '@ofbiz/services/product/product-facility.service';
import { TokenStorageService } from '@ofbiz/services/common/token-storage.service';
import { ReportService } from '@ofbiz/services/report/report.service';


describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let companyServiceSpy: jasmine.SpyObj<CompanyService>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let productFacilityServiceSpy: jasmine.SpyObj<ProductFacilityService>;
  let reportServiceSpy: jasmine.SpyObj<ReportService>;

  beforeEach(async () => {
    reportServiceSpy = jasmine.createSpyObj<ReportService>('ReportService', [
      'getSalesTrend',
    ]);
    companyServiceSpy = jasmine.createSpyObj<CompanyService>('CompanyService', ['loadContext'], {
      contextSignal: signal({
        loading: false,
        companyName: 'Company One',
        companyPartyId: 'COMPANY_1',
        companyProfile: null,
        companyAddress: null,
        companyLogoUrl: null,
        stores: [],
        facilities: [{ facilityId: 'FAC_1', facilityName: 'Facility One' }],
        storeFacilitiesByStoreId: {},
        primaryStore: null,
      }),
    });
    productServiceSpy = jasmine.createSpyObj<ProductService>('ProductService', ['getProducts']);
    partyServiceSpy = jasmine.createSpyObj<PartyService>('PartyService', ['getSuppliers']);
    productFacilityServiceSpy = jasmine.createSpyObj<ProductFacilityService>('ProductFacilityService', ['getProductFacilities']);

    reportServiceSpy.getSalesTrend.and.returnValue(of([
      { date: '2026-06-14', amount: 150 },
    ]));
    productServiceSpy.getProducts.and.returnValue(of({
      documentList: [{ productId: 'PRD1' }],
      documentListCount: 1,
    } as any));
    partyServiceSpy.getSuppliers.and.returnValue(of({
      resultList: [{ partyId: 'SUP1' }],
    } as any));
    productFacilityServiceSpy.getProductFacilities.and.returnValue(of([
      { reorderQuantity: 5 },
    ] as any));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: CompanyService, useValue: companyServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: ProductFacilityService, useValue: productFacilityServiceSpy },
        { provide: TokenStorageService, useValue: { getTenantId: () => 'TN1' } },
        { provide: ReportService, useValue: reportServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('loads the sales trend and onboarding checklist without the removed usage summary', () => {
    fixture.detectChanges();

    expect(reportServiceSpy.getSalesTrend).toHaveBeenCalledWith({ datePreset: 'LAST_7_DAYS' });
    expect(component.salesTrend()).toHaveSize(1);
    expect(component.onboardingItems()).toEqual([
      {
        label: 'HOME.ONBOARDING_PRODUCTS_SYNCED',
        detail: 'HOME.ONBOARDING_PRODUCTS_SYNCED_DETAIL',
        done: true,
      },
      {
        label: 'HOME.ONBOARDING_REORDER_POINTS',
        detail: 'HOME.ONBOARDING_REORDER_POINTS_DETAIL',
        done: true,
      },
      {
        label: 'HOME.ONBOARDING_SUPPLIER',
        detail: 'HOME.ONBOARDING_SUPPLIER_DETAIL',
        done: true,
      },
    ]);
  });

  it('sets the error state when the sales trend loading fails', () => {
    reportServiceSpy.getSalesTrend.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.salesTrend()).toEqual([]);
  });
});
