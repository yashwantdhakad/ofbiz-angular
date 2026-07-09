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
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../common/api.service';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getOms', 'getWms']);

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(ReportService);
  });

  it('builds cashflow forecast and vendor performance endpoints', () => {
    apiServiceSpy.getOms.and.returnValue(of({} as any));

    service.getCashflowForecast('2026-06-01', '2026-06-30').subscribe();
    service.getVendorPerformance('2026-06-01', '2026-06-30', 15).subscribe();

    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/cashflow/forecast?fromDate=2026-06-01&thruDate=2026-06-30');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/vendors/performance?fromDate=2026-06-01&thruDate=2026-06-30&limit=15');
  });

  it('builds sales report endpoints with date and facility filters', () => {
    apiServiceSpy.getOms.and.returnValue(of([] as any));
    const filters = {
      datePreset: 'THIS_MONTH',
      fromDate: '2026-07-01',
      toDate: '2026-07-09',
      facilityId: 'FAC-1',
    };

    service.getSalesOverview(filters).subscribe();
    service.getSalesTrend(filters).subscribe();
    service.getTopProducts(filters, 5).subscribe();
    service.getSupplierRisk(filters, 6).subscribe();

    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/sales/overview?datePreset=THIS_MONTH&fromDate=2026-07-01&toDate=2026-07-09&facilityId=FAC-1');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/sales/trend?datePreset=THIS_MONTH&fromDate=2026-07-01&toDate=2026-07-09&facilityId=FAC-1');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/sales/top-products?datePreset=THIS_MONTH&fromDate=2026-07-01&toDate=2026-07-09&facilityId=FAC-1&limit=5');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/sales/supplier-risk?datePreset=THIS_MONTH&fromDate=2026-07-01&toDate=2026-07-09&facilityId=FAC-1&limit=6');
  });

  it('builds inventory report endpoints without date filters where inventory-only applies', () => {
    apiServiceSpy.getWms.and.returnValue(of([] as any));
    apiServiceSpy.getOms.and.returnValue(of([] as any));

    service.getInventoryOverview({
      datePreset: 'THIS_MONTH',
      fromDate: '2026-07-01',
      toDate: '2026-07-09',
      facilityId: 'FAC-1',
    }).subscribe();
    service.getLowStockByFacility(4).subscribe();
    service.getSupplierReturnSignals({ fromDate: '2026-07-01', facilityId: 'FAC-1' }, 3).subscribe();

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/reports/inventory/overview?facilityId=FAC-1');
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/reports/inventory/low-stock-by-facility?limit=4');
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/reports/inventory/supplier-return-signals?fromDate=2026-07-01&facilityId=FAC-1&limit=3');
  });

  it('builds accounting report endpoints with optional date ranges', () => {
    apiServiceSpy.getOms.and.returnValue(of([] as any));

    service.getTrialBalance('2026-07-01', '2026-07-09').subscribe();
    service.getTrialBalance().subscribe();
    service.getProfitLossReport('2026-07-01', null).subscribe();
    service.getCashflowForecast().subscribe();
    service.getVendorPerformance(null, null).subscribe();

    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/accounting/trial-balance?fromDate=2026-07-01&toDate=2026-07-09');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/accounting/trial-balance');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/accounting/profit-loss?fromDate=2026-07-01');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/cashflow/forecast');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/reports/vendors/performance?limit=10');
  });
});
