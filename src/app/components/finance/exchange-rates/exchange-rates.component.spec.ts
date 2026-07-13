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
import { NO_ERRORS_SCHEMA, EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ExchangeRatesComponent } from './exchange-rates.component';
import { ExchangeRateService } from '@ofbiz/services/accounting/exchange-rate.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('ExchangeRatesComponent', () => {
  let component: ExchangeRatesComponent;
  let fixture: ComponentFixture<ExchangeRatesComponent>;
  let exchangeRateService: jasmine.SpyObj<ExchangeRateService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;

  const activeRate = {
    uomId: 'INR', uomIdTo: 'USD', conversionFactor: 0.012,
    fromDate: '2020-01-01 00:00:00.0', thruDate: null, active: true,
  };
  const expiredRate = {
    uomId: 'INR', uomIdTo: 'USD', conversionFactor: 0.013,
    fromDate: '2019-01-01 00:00:00.0', thruDate: '2020-01-01 00:00:00.0', active: false,
  };

  beforeEach(async () => {
    const exchangeRateSpy = jasmine.createSpyObj('ExchangeRateService', ['listExchangeRates', 'createExchangeRate']);
    const commonSpy = jasmine.createSpyObj('CommonService', ['getUoms']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
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
      declarations: [ExchangeRatesComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ExchangeRateService, useValue: exchangeRateSpy },
        { provide: CommonService, useValue: commonSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangeRatesComponent);
    component = fixture.componentInstance;
    exchangeRateService = TestBed.inject(ExchangeRateService) as jasmine.SpyObj<ExchangeRateService>;
    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
  });

  it('loads rates on init and hides expired ones by default', fakeAsync(() => {
    exchangeRateService.listExchangeRates.and.returnValue(of([activeRate, expiredRate] as any));
    commonService.getUoms.and.returnValue(of([{ uomId: 'INR' }, { uomId: 'USD' }] as any));

    component.ngOnInit();
    tick();

    expect(commonService.getUoms).toHaveBeenCalledWith('CURRENCY_MEASURE');
    expect(component.rates()).toHaveSize(2);
    expect(component.visibleRates()).toEqual([activeRate] as any);

    component.toggleHistory();
    expect(component.visibleRates()).toHaveSize(2);
  }));

  it('shows an error when loading fails', fakeAsync(() => {
    exchangeRateService.listExchangeRates.and.returnValue(throwError(() => new Error('boom')));
    commonService.getUoms.and.returnValue(of([]));

    component.ngOnInit();
    tick();

    expect(component.rates()).toEqual([]);
    expect(component.error()).toBe('FINANCE.EXCHANGE_RATES_LOAD_ERROR');
    expect(snackbarService.showError).toHaveBeenCalled();
  }));

  it('creates a rate from the dialog result and reloads', fakeAsync(() => {
    exchangeRateService.listExchangeRates.and.returnValue(of([activeRate] as any));
    commonService.getUoms.and.returnValue(of([{ uomId: 'INR' }, { uomId: 'USD' }] as any));
    component.ngOnInit();
    tick();

    const payload = { uomId: 'USD', uomIdTo: 'EUR', conversionFactor: 0.9, withReverse: 'Y' };
    dialog.open.and.returnValue({ afterClosed: () => of(payload) } as any);
    exchangeRateService.createExchangeRate.and.returnValue(of({}));

    component.openCreateDialog();
    tick();

    expect(exchangeRateService.createExchangeRate).toHaveBeenCalledWith(payload as any);
    expect(snackbarService.showSuccess).toHaveBeenCalled();
  }));

  it('does nothing when the dialog is cancelled', fakeAsync(() => {
    exchangeRateService.listExchangeRates.and.returnValue(of([]));
    commonService.getUoms.and.returnValue(of([]));
    component.ngOnInit();
    tick();

    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.openCreateDialog();
    tick();

    expect(exchangeRateService.createExchangeRate).not.toHaveBeenCalled();
  }));
});
