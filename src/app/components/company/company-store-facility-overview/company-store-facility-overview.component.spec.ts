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
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CompanyStoreFacilityOverviewComponent } from './company-store-facility-overview.component';
import { CompanyService } from '../../../services/company/company.service';

describe('CompanyStoreFacilityOverviewComponent', () => {
  let component: CompanyStoreFacilityOverviewComponent;
  let fixture: ComponentFixture<CompanyStoreFacilityOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyStoreFacilityOverviewComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
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
              stores: [
                { id: 1, productStoreId: 'STORE_1', storeName: 'Main Store', companyName: 'Test Company', defaultCurrencyUomId: 'USD', payToPartyId: 'COMPANY_1' },
              ],
              facilities: [],
              storeFacilitiesByStoreId: {
                STORE_1: [
                  { facilityId: 'FAC_1', facility: { facilityName: 'Warehouse', facilityTypeId: 'WAREHOUSE' } },
                ],
              },
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

    fixture = TestBed.createComponent(CompanyStoreFacilityOverviewComponent);
    component = fixture.componentInstance;
  });

  it('should expose store and facility rows from company context', () => {
    fixture.detectChanges();

    expect(component.context().stores).toHaveSize(1);
    expect(component.facilityRows()).toEqual([
      {
        storeId: 'STORE_1',
        facilityId: 'FAC_1',
        facilityName: 'Warehouse',
        facilityTypeId: 'WAREHOUSE',
      },
    ]);
  });
});
