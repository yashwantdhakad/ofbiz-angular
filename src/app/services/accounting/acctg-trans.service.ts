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

export interface AcctgTrans {
  id?: number | null;
  acctgTransId?: string | null;
  acctgTransTypeId?: string | null;
  description?: string | null;
  transactionDate?: string | null;
  isPosted?: boolean | null;
  postedDate?: string | null;
  scheduledPostingDate?: string | null;
  glJournalId?: string | null;
  glFiscalTypeId?: string | null;
  voucherRef?: string | null;
  voucherDate?: string | null;
  groupStatusId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  partyId?: string | null;
  roleTypeId?: string | null;
}

export interface AcctgTransEntry {
  id?: number | null;
  acctgTransId?: string | null;
  acctgTransEntrySeqId?: string | null;
  acctgTransEntryTypeId?: string | null;
  description?: string | null;
  glAccountId?: string | null;
  amount?: number | string | null;
  currencyUomId?: string | null;
  debitCreditFlag?: boolean | null;
  isSummary?: boolean | null;
}

export interface AcctgTransPage {
  content: AcctgTrans[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root',
})
export class AcctgTransService {
  constructor(private apiService: ApiService) {}

  listTransactions(page = 0, size = 500): Observable<AcctgTrans[]> {
    return this.apiService.get<any>(`/common/accounting/acctg-transes?page=${page}&size=${size}`).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  searchTransactions(params: {
    page?: number;
    size?: number;
    query?: string;
    posted?: boolean;
  } = {}): Observable<AcctgTransPage> {
    const query = new URLSearchParams();
    query.append('page', String(params.page ?? 0));
    query.append('size', String(params.size ?? 20));
    if (params.query) {
      query.append('query', params.query);
    }
    if (params.posted !== undefined) {
      query.append('posted', String(params.posted));
    }
    return this.apiService.get<any>(`/common/accounting/acctg-transes/page?${query.toString()}`).pipe(
      map((res) => (res?.data ?? res) as AcctgTransPage)
    );
  }

  getTransaction(id: number): Observable<AcctgTrans> {
    return this.apiService.get<any>(`/common/accounting/acctg-transes/${encodeURIComponent(String(id))}`).pipe(
      map((res) => (res?.data ?? res) as AcctgTrans)
    );
  }

  createTransaction(payload: AcctgTrans): Observable<AcctgTrans> {
    return this.apiService.post<any>('/common/accounting/acctg-transes', payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updateTransaction(id: number, payload: AcctgTrans): Observable<AcctgTrans> {
    return this.apiService.put<any>(`/common/accounting/acctg-transes/${encodeURIComponent(String(id))}`, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  deleteTransaction(id: number): Observable<void> {
    return this.apiService.delete<any>(`/common/accounting/acctg-transes/${encodeURIComponent(String(id))}`).pipe(
      map((res) => res?.data ?? res)
    );
  }

  listEntries(page = 0, size = 500): Observable<AcctgTransEntry[]> {
    return this.apiService.get<any>(`/common/accounting/acctg-trans-entrys?page=${page}&size=${size}`).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  listEntriesByTransactionIds(transactionIds: string[]): Observable<AcctgTransEntry[]> {
    const query = new URLSearchParams();
    transactionIds.forEach((id) => query.append('transactionIds', id));
    return this.apiService.get<any>(`/common/accounting/acctg-trans-entrys/by-transactions?${query.toString()}`).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  getEntry(id: number): Observable<AcctgTransEntry> {
    return this.apiService.get<any>(`/common/accounting/acctg-trans-entrys/${encodeURIComponent(String(id))}`).pipe(
      map((res) => (res?.data ?? res) as AcctgTransEntry)
    );
  }

  createEntry(payload: AcctgTransEntry): Observable<AcctgTransEntry> {
    return this.apiService.post<any>('/common/accounting/acctg-trans-entrys', payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updateEntry(id: number, payload: AcctgTransEntry): Observable<AcctgTransEntry> {
    return this.apiService.put<any>(`/common/accounting/acctg-trans-entrys/${encodeURIComponent(String(id))}`, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  deleteEntry(id: number): Observable<void> {
    return this.apiService.delete<any>(`/common/accounting/acctg-trans-entrys/${encodeURIComponent(String(id))}`).pipe(
      map((res) => res?.data ?? res)
    );
  }
}
