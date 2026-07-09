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
export class SupplierProductService {
  constructor(private apiService: ApiService) {}

  listByParty(partyId: string): Observable<any[]> {
    const url = `/common/supplier-products?partyId=${encodeURIComponent(partyId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  listByPartyPaged(partyId: string, page: number, size: number): Observable<any> {
    const url = `/common/supplier-products/by-party?partyId=${encodeURIComponent(
      partyId
    )}&page=${page}&size=${size}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? {})
    );
  }

  listByProduct(productId: string): Observable<any[]> {
    const url = `/common/supplier-products?productId=${encodeURIComponent(productId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  getLatestByPartyAndProduct(partyId: string, productId: string): Observable<any> {
    const url = `/common/supplier-products/by-party-product?partyId=${encodeURIComponent(
      partyId
    )}&productId=${encodeURIComponent(productId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? {})
    );
  }

  create(payload: any): Observable<any> {
    return this.apiService.post<any>('/common/supplier-products', payload).pipe(
      map((res) => res?.data ?? {})
    );
  }

  delete(id: number): Observable<any> {
    return this.apiService.delete<any>(`/common/supplier-products/${id}`).pipe(
      map((res) => res?.data ?? {})
    );
  }
}
