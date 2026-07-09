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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReportService } from '@ofbiz/services/report/report.service';
import { SharedFormatPipesModule } from '../../common/material/shared-format-pipes.module';
import { CashflowForecastComponent } from './cashflow-forecast.component';

describe('CashflowForecastComponent', () => {
  let component: CashflowForecastComponent;
  let fixture: ComponentFixture<CashflowForecastComponent>;
  let reportServiceSpy: jasmine.SpyObj<ReportService>;

  beforeEach(async () => {
    reportServiceSpy = jasmine.createSpyObj('ReportService', ['getCashflowForecast']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError']);
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
      imports: [CashflowForecastComponent, TranslateModule.forRoot(), SharedFormatPipesModule],
      providers: [
        provideRouter([]),
        { provide: ReportService, useValue: reportServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CashflowForecastComponent);
    component = fixture.componentInstance;
  });

  it('loads cashflow buckets and summary on init', fakeAsync(() => {
    reportServiceSpy.getCashflowForecast.and.returnValue(of({
      summary: {
        fromDate: '2026-06-01',
        thruDate: '2026-06-30',
        expectedInflow: 1200,
        expectedOutflow: 500,
        netCashFlow: 700,
        inflowDocumentCount: 2,
        outflowDocumentCount: 1,
        currencyUomId: 'USD',
      },
      buckets: [{ bucketDate: '2026-06-10', expectedInflow: 1200, expectedOutflow: 500, netCashFlow: 700, inflowDocumentCount: 2, outflowDocumentCount: 1 }],
    } as any));

    component.ngOnInit();
    tick();

    expect(component.report()?.summary.expectedInflow).toBe(1200);
    expect(component.summaryCards()).toHaveSize(5);
    expect(component.currencyCode()).toBe('USD');
  }));

  it('refreshes using the selected date range', fakeAsync(() => {
    reportServiceSpy.getCashflowForecast.and.returnValue(of({ summary: null, buckets: [] } as any));

    component.filterForm.controls.fromDate.setValue(new Date(2026, 5, 1));
    component.filterForm.controls.thruDate.setValue(new Date(2026, 5, 30));
    component.load();
    tick();

    expect(reportServiceSpy.getCashflowForecast).toHaveBeenCalledWith('2026-06-01', '2026-06-30');
  }));
});
