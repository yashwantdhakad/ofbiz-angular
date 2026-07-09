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

@Injectable({
  providedIn: 'root',
})
export class ReturnService {
  constructor(private apiService: ApiService) {}

  searchOrderCandidates(orderTypeId: string, query: string, size: number = 20): Observable<any[]> {
    const params = new URLSearchParams();
    if (orderTypeId) params.append('orderTypeId', orderTypeId);
    if (query) params.append('query', query);
    params.append('size', String(size));
    return this.apiService.get(`/common/returns/order-candidates?${params.toString()}`).pipe(
      map((r: any) => {
        const d = r?.data ?? r;
        return [d?.orders, d].find((candidate: any) => Array.isArray(candidate)) ?? [];
      })
    );
  }

  getOrderForReturn(orderId: string): Observable<any> {
    return this.apiService.get(`/common/returns/order-candidates/${encodeURIComponent(orderId)}`).pipe(
      map((r: any) => {
        const d = r?.data ?? r;
        return d?.order ?? d;
      })
    );
  }

  createReturn(payload: any): Observable<any> {
    return this.apiService.post('/common/returns', payload).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  getReturn(returnId: string): Observable<any> {
    return this.apiService.get(`/common/returns/${encodeURIComponent(returnId)}`).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  acceptReturn(returnId: string): Observable<any> {
    return this.apiService.post(`/common/returns/${encodeURIComponent(returnId)}/accept`, {}).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  rejectReturn(returnId: string): Observable<any> {
    return this.apiService.post(`/common/returns/${encodeURIComponent(returnId)}/reject`, {}).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  receiveReturn(returnId: string, payload: any): Observable<any> {
    return this.apiService.post(`/common/returns/${encodeURIComponent(returnId)}/receive`, payload).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  listReturns(params: {
    orderId?: string;
    returnId?: string;
    statusId?: string;
    orderTypeId?: string;
    returnTypeId?: string;
    page?: number;
    size?: number;
  } = {}): Observable<any> {
    const query = new URLSearchParams();
    if (params.orderId)     query.append('orderId',     params.orderId);
    if (params.returnId)    query.append('returnId',    params.returnId);
    if (params.statusId)    query.append('statusId',    params.statusId);
    if (params.orderTypeId) query.append('orderTypeId', params.orderTypeId);
    if (params.returnTypeId) query.append('returnTypeId', params.returnTypeId);
    query.append('page', String(params.page ?? 0));
    query.append('size', String(params.size ?? 10));
    const suffix = query.toString();
    const returnsPath = suffix ? `/common/returns?${suffix}` : '/common/returns';
    return this.apiService.get(returnsPath).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  listReturnTypes(): Observable<any[]> {
    return this.apiService.get('/common/returns/lookup/types').pipe(
      map((r: any) => {
        const d = r?.data ?? r;
        return [d?.types, d].find((candidate: any) => Array.isArray(candidate)) ?? [];
      })
    );
  }

  listReturnReasons(): Observable<any[]> {
    return this.apiService.get('/common/returns/lookup/reasons').pipe(
      map((r: any) => {
        const d = r?.data ?? r;
        return [d?.reasons, d].find((candidate: any) => Array.isArray(candidate)) ?? [];
      })
    );
  }

  listReturnItemTypes(): Observable<any[]> {
    return this.apiService.get('/common/returns/lookup/item-types').pipe(
      map((r: any) => {
        const d = r?.data ?? r;
        return [d?.itemTypes, d].find((candidate: any) => Array.isArray(candidate)) ?? [];
      })
    );
  }
}
