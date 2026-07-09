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

export interface PaymentSearchFilters {
  queryString?: string;
  paymentTypeId?: string;
  paymentMethodTypeId?: string;
  statusId?: string;
  paymentDate?: string;
}

export interface PaymentSummary {
  id: number | string;
  paymentId?: string | null;
  partyName?: string | null;
  partyIdFrom?: string | null;
  partyIdTo?: string | null;
  paymentTypeId?: string | null;
  paymentTypeDescription?: string | null;
  paymentMethodTypeId?: string | null;
  paymentMethodLabel?: string | null;
  effectiveDate?: string | null;
  statusId?: string | null;
  statusDescription?: string | null;
  amount?: number | string | null;
  currencyUomId?: string | null;
}

export interface PaymentSearchResponse {
  resultList?: PaymentSummary[] | null;
  totalCount?: number | string | null;
}

export interface PaymentTypeOption {
  paymentTypeId?: string | null;
  description?: string | null;
}

export interface PaymentMethodTypeOption {
  paymentMethodTypeId?: string | null;
  description?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private apiService: ApiService) {}

  findPayments(pageIndex: number, pageSize: number, filters: PaymentSearchFilters): Observable<PaymentSearchResponse> {
    const params = new URLSearchParams();
    params.append('page', (pageIndex - 1).toString()); // OFBiz starts page index at 0
    params.append('size', pageSize.toString());
    if (filters.queryString) {
      params.append('queryString', filters.queryString);
    }
    if (filters.paymentTypeId) {
      params.append('paymentTypeId', filters.paymentTypeId);
    }
    if (filters.paymentMethodTypeId) {
      params.append('paymentMethodTypeId', filters.paymentMethodTypeId);
    }
    if (filters.statusId) {
      params.append('statusId', filters.statusId);
    }
    if (filters.paymentDate) {
      params.append('paymentDate', filters.paymentDate);
    }
    return this.apiService.get<any>(`/common/accounting/payments/find?${params.toString()}`).pipe(
      map((response: any) => ({
        resultList: Array.isArray(response?.data?.resultList) ? response.data.resultList : [],
        totalCount: response?.data?.totalCount ?? 0,
      } as PaymentSearchResponse))
    );
  }

  getPaymentTypes(): Observable<PaymentTypeOption[]> {
    return this.apiService.get<any>('/common/accounting/payment-types').pipe(
      map((response: any) => Array.isArray(response?.data?.resultList) ? response.data.resultList : [])
    );
  }

  getPaymentMethodTypes(): Observable<PaymentMethodTypeOption[]> {
    return this.apiService.get<any>('/common/accounting/payment-method-types').pipe(
      map((response: any) => Array.isArray(response?.data?.resultList) ? response.data.resultList : [])
    );
  }

  getPaymentDetail(id: number | string): Observable<any> {
    const identifier = String(id ?? '').trim();
    if (!identifier) {
      return new Observable((subscriber) => subscriber.error(new Error('Payment id is required')));
    }
    return this.apiService.get<any>(`/common/accounting/payments/${encodeURIComponent(identifier)}/detail`).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  changePaymentStatus(id: number | string, statusId: string, paymentRefNum?: string): Observable<any> {
    return this.apiService.post<any>(
      `/common/accounting/payments/${encodeURIComponent(String(id))}/status`,
      { statusId, paymentRefNum }
    ).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  listPayments(): Observable<any[]> {
    return this.apiService.get<any>('/common/accounting/payments').pipe(
      map((response: any) => Array.isArray(response?.data?.resultList) ? response.data.resultList : [])
    );
  }

  applyPaymentToInvoice(payload: any): Observable<any> {
    return this.apiService.post<any>('/common/accounting/payments/apply', payload).pipe(
      map((response: any) => response?.data ?? response)
    );
  }
}
