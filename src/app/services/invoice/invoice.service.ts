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
import { base64ToBlob } from '../common/blob.util';

export type MoneyValue = number | string | null;

export interface InvoiceListItem {
  id: number | string;
  invoiceId?: string | null;
  partyId?: string | null;
  partyIdFrom?: string | null;
  partyName?: string | null;
  fromPartyName?: string | null;
  toPartyName?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  statusId?: string | null;
  statusDescription?: string | null;
  grandTotal?: MoneyValue;
  total?: MoneyValue;
  currencyUomId?: string | null;
  currencyUom?: string | null;
}

export interface InvoiceFindResponse {
  items?: InvoiceListItem[] | null;
  total?: MoneyValue;
}

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  constructor(private apiService: ApiService) {}

  listInvoices(): Observable<InvoiceListItem[]> {
    return this.apiService.get<any>('/common/accounting/invoices').pipe(
      map((response: any) => Array.isArray(response?.data?.resultList) ? response.data.resultList : [])
    );
  }

  findInvoices(
    mode: 'sales' | 'purchase',
    pageIndex: number,
    pageSize: number,
    queryString: string,
    statusId?: string
  ): Observable<InvoiceFindResponse> {
    const params = new URLSearchParams();
    params.append('mode', mode);
    params.append('page', Math.max(pageIndex - 1, 0).toString());
    params.append('size', pageSize.toString());
    if (queryString) {
      params.append('queryString', queryString);
    }
    if (statusId) {
      params.append('statusId', statusId);
    }
    return this.apiService.get<any>(`/common/accounting/invoices/find?${params.toString()}`).pipe(
      map((response: any) => ({
        items: Array.isArray(response?.data?.items) ? response.data.items : [],
        total: response?.data?.total ?? 0,
      } as InvoiceFindResponse))
    );
  }

  getInvoiceDetail(id: number | string): Observable<any> {
    const identifier = String(id ?? '').trim();
    if (!identifier) {
      return new Observable((subscriber) => subscriber.error(new Error('Invoice id is required')));
    }
    return this.apiService.get<any>(`/common/accounting/invoices/${encodeURIComponent(identifier)}/detail`).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  getInvoicePdf(id: number | string): Observable<Blob> {
    // OFBiz returns the bytes via success response or raw stream.
    // In our groovy service, we returned {"pdfBytes": "..."} or raw stream.
    // Wait, let's see how our mock pdfBytes can be parsed. If we return raw bytes from getInvoicePdf,
    // we can decode the base64 or construct PDF in the frontend. Or we can return a proper raw PDF stream.
    // Since getBlob retrieves the response as a blob, let's write getInvoicePdf to hit the endpoint.
    return this.apiService.get<any>(`/common/accounting/invoices/${encodeURIComponent(String(id))}/pdf`).pipe(
      map((response: any) => base64ToBlob(response?.data?.pdfBytes, 'application/pdf'))
    );
  }

  changeInvoiceStatus(id: number | string, statusId: string, changeByUserLoginId?: string): Observable<any> {
    return this.apiService.post<any>(
      `/common/accounting/invoices/${encodeURIComponent(String(id))}/status`,
      { statusId, changeByUserLoginId }
    ).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  applyPayment(id: number | string, payload: any): Observable<any> {
    return this.apiService.post<any>(
      `/common/accounting/invoices/${encodeURIComponent(String(id))}/payments/apply`,
      payload
    ).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  removePaymentApplication(id: number | string, paymentApplicationId: string): Observable<any> {
    return this.apiService.delete<any>(
      `/common/accounting/invoices/${encodeURIComponent(String(id))}/payments/${encodeURIComponent(paymentApplicationId)}`
    ).pipe(
      map((response: any) => response?.data ?? response)
    );
  }
}
