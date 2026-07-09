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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EventEmitter, NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TrialBalanceReportComponent } from './trial-balance-report.component';
import { ReportService } from '@ofbiz/services/report/report.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { SharedFormatPipesModule } from '../../common/material/shared-format-pipes.module';

describe('TrialBalanceReportComponent', () => {
  let component: TrialBalanceReportComponent;
  let fixture: ComponentFixture<TrialBalanceReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    const reportSpy = jasmine.createSpyObj('ReportService', ['getTrialBalance']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));
    translateSpy.stream.and.callFake((key: string) => of(key));
    Object.defineProperties(translateSpy, {
      onTranslationChange: { value: new EventEmitter(), configurable: true },
      onLangChange: { value: new EventEmitter(), configurable: true },
      onDefaultLangChange: { value: new EventEmitter(), configurable: true },
    });

    await TestBed.configureTestingModule({
      imports: [TrialBalanceReportComponent, ReactiveFormsModule, TranslateModule.forRoot(), SharedFormatPipesModule],
      providers: [
        { provide: ReportService, useValue: reportSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TrialBalanceReportComponent);
    component = fixture.componentInstance;
    reportService = TestBed.inject(ReportService) as jasmine.SpyObj<ReportService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
  });

  it('loads trial balance rows on init', fakeAsync(() => {
    reportService.getTrialBalance.and.returnValue(of([
      { accountCode: '1000', accountName: 'Cash', accountType: 'Asset', totalDebits: 200, totalCredits: 50, netBalance: 150 },
    ]));

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    expect(component.rows()).toHaveSize(1);
    expect(component.totalDebits()).toBe(200);
    expect(component.netBalance()).toBe(150);
  }));

  it('reloads the report with the selected period', fakeAsync(() => {
    reportService.getTrialBalance.and.returnValue(of([]));

    component.filterForm.fromDate.setValue('2026-01-01');
    component.filterForm.toDate.setValue('2026-01-31');
    component.loadReport();
    tick();

    expect(reportService.getTrialBalance).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    expect(snackbarService.showError).not.toHaveBeenCalled();
  }));

  it('resets filters and reloads report', fakeAsync(() => {
    reportService.getTrialBalance.and.returnValue(of([]));
    
    component.resetFilters();
    tick();

    expect(component.filterForm.fromDate.value).toBeTruthy();
    expect(component.filterForm.toDate.value).toBeTruthy();
    expect(reportService.getTrialBalance).toHaveBeenCalled();
  }));

  it('calculates totalCredits correctly', () => {
    component.rows.set([
      { accountCode: '1000', accountName: 'Cash', accountType: 'Asset', totalDebits: 200, totalCredits: 50, netBalance: 150 },
      { accountCode: '2000', accountName: 'Equity', accountType: 'Equity', totalDebits: 0, totalCredits: 100, netBalance: -100 },
    ]);

    expect(component.totalCredits()).toBe(150);
  });

  it('handles error when reportService.getTrialBalance fails', fakeAsync(() => {
    reportService.getTrialBalance.and.returnValue(throwError(() => new Error('Error loading report')));

    component.loadReport();
    tick();

    expect(component.rows()).toEqual([]);
    expect(component.errorMessage()).toBe('REPORTS.LOAD_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('REPORTS.LOAD_ERROR');
  }));

  it('normalizes toDateString boundary values', () => {
    const toDateString = (component as any).toDateString.bind(component);

    expect(toDateString(null)).toBe('');
    expect(toDateString('invalid-date')).toBe('');
    expect(toDateString(new Date(2026, 5, 15))).toBe('2026-06-15');
  });
});
