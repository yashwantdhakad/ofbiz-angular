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
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../common/api.service';

export interface ExchangeRate {
  uomId?: string | null;
  uomDescription?: string | null;
  uomIdTo?: string | null;
  uomToDescription?: string | null;
  conversionFactor?: number | null;
  fromDate?: string | null;
  thruDate?: string | null;
  active?: boolean | null;
}

export interface CreateExchangeRatePayload {
  uomId: string;
  uomIdTo: string;
  conversionFactor: number;
  withReverse?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExchangeRateService {
  constructor(private apiService: ApiService) {}

  listExchangeRates(): Observable<ExchangeRate[]> {
    return this.apiService.get<any>('/common/accounting/exchange-rates').pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  createExchangeRate(payload: CreateExchangeRatePayload): Observable<any> {
    return this.apiService.post<any>('/common/accounting/exchange-rates', payload).pipe(
      map((res) => res?.data ?? res)
    );
  }
}
