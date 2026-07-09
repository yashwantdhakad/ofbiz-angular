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
import { EventEmitter, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReportService } from '@ofbiz/services/report/report.service';
import { SharedFormatPipesModule } from '../../common/material/shared-format-pipes.module';
import { VendorPerformanceComponent } from './vendor-performance.component';

describe('VendorPerformanceComponent', () => {
  let component: VendorPerformanceComponent;
  let fixture: ComponentFixture<VendorPerformanceComponent>;
  let reportServiceSpy: jasmine.SpyObj<ReportService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    reportServiceSpy = jasmine.createSpyObj('ReportService', ['getVendorPerformance']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showError']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.returnValue(of(''));
    translateSpy.stream.and.returnValue(of(''));
    Object.defineProperties(translateSpy, {
      onTranslationChange: { value: new EventEmitter(), configurable: true },
      onLangChange: { value: new EventEmitter(), configurable: true },
      onDefaultLangChange: { value: new EventEmitter(), configurable: true },
    });

    await TestBed.configureTestingModule({
      imports: [VendorPerformanceComponent, TranslateModule.forRoot(), SharedFormatPipesModule],
      providers: [
        provideRouter([]),
        { provide: ReportService, useValue: reportServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorPerformanceComponent);
    component = fixture.componentInstance;
  });

  it('loads vendor performance rows on init', fakeAsync(() => {
    reportServiceSpy.getVendorPerformance.and.returnValue(of({
      items: [{
        supplierPartyId: 'SUP-1',
        supplierName: 'Vendor 1',
        purchaseOrderCount: 4,
        openPurchaseOrderCount: 1,
        purchaseOrderValue: 1000,
        openPurchaseOrderValue: 250,
        receiptCount: 3,
        receivedQuantity: 12,
        rejectedQuantity: 1,
        onTimeReceiptRate: 0.75,
        averageDeliveryDelayDays: 1.5,
        purchaseInvoiceValue: 980,
        priceVarianceAmount: 20,
        priceVarianceRate: 0.02,
        qualityRejectionRate: 0.083,
        score: 88.5,
      }],
      totalCount: 1,
      averageScore: 88.5,
    } as any));

    component.ngOnInit();
    tick();

    expect(component.report()?.items.length).toBe(1);
    expect(component.summaryCards()).toHaveSize(3);
    expect(component.scoreClass(90)).toBe('score-good');
  }));

  it('resets filters and reloads report', fakeAsync(() => {
    reportServiceSpy.getVendorPerformance.and.returnValue(of({} as any));

    component.reset();
    tick();

    expect(component.filterForm.controls.fromDate.value).toBeTruthy();
    expect(component.filterForm.controls.thruDate.value).toBeTruthy();
    expect(component.filterForm.controls.limit.value).toBe(10);
    expect(reportServiceSpy.getVendorPerformance).toHaveBeenCalled();
  }));

  it('returns appropriate CSS class based on score values', () => {
    expect(component.scoreClass(85)).toBe('score-good');
    expect(component.scoreClass(75)).toBe('score-medium');
    expect(component.scoreClass(70)).toBe('score-medium');
    expect(component.scoreClass(60)).toBe('score-low');
    expect(component.scoreClass(null)).toBe('score-low');
  });

  it('handles error when reportService.getVendorPerformance fails', fakeAsync(() => {
    reportServiceSpy.getVendorPerformance.and.returnValue(throwError(() => new Error('Error loading report')));

    component.load();
    tick();

    expect(component.report()).toBeNull();
    expect(component.errorMessage()).toBe('REPORTS.LOAD_ERROR');
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('REPORTS.LOAD_ERROR');
  }));

  it('normalizes toDateString boundary values', () => {
    const toDateString = (component as any).toDateString.bind(component);

    expect(toDateString(null)).toBeNull();
    expect(toDateString(new Date(2026, 5, 15))).toBe('2026-06-15');
  });
});
