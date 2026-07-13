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
import { ExchangeRateService } from './exchange-rate.service';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        ExchangeRateService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(ExchangeRateService);
  });

  it('lists exchange rates and falls back to an empty array', () => {
    apiService.get.and.returnValues(
      of({ data: { resultList: [{ uomId: 'INR', uomIdTo: 'USD', conversionFactor: 0.012 }] } } as any),
      of({ data: {} } as any)
    );

    service.listExchangeRates().subscribe((result) =>
      expect(result).toEqual([{ uomId: 'INR', uomIdTo: 'USD', conversionFactor: 0.012 }]));
    service.listExchangeRates().subscribe((result) => expect(result).toEqual([]));

    expect(apiService.get).toHaveBeenCalledWith('/common/accounting/exchange-rates');
  });

  it('creates an exchange rate and unwraps the data envelope', () => {
    apiService.post.and.returnValue(of({ data: { uomId: 'INR', uomIdTo: 'USD' } } as any));

    const payload = { uomId: 'INR', uomIdTo: 'USD', conversionFactor: 0.012 };
    service.createExchangeRate(payload).subscribe((result) =>
      expect(result).toEqual({ uomId: 'INR', uomIdTo: 'USD' }));

    expect(apiService.post).toHaveBeenCalledWith('/common/accounting/exchange-rates', payload);
  });
});
