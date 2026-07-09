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

export interface GlAccount {
  id?: number | null;
  glAccountId?: string | null;
  glAccountTypeId?: string | null;
  glAccountClassId?: string | null;
  glResourceTypeId?: string | null;
  glXbrlClassId?: string | null;
  parentGlAccountId?: string | null;
  accountCode?: string | null;
  accountName?: string | null;
  description?: string | null;
  productId?: string | null;
  externalId?: string | null;
}

export interface GlAccountType {
  id?: number | null;
  glAccountTypeId?: string | null;
  parentTypeId?: string | null;
  hasTable?: boolean | null;
  description?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class GlAccountService {
  constructor(private apiService: ApiService) {}

  listGlAccounts(page = 0, size = 500): Observable<GlAccount[]> {
    return this.apiService.get<any>(`/common/accounting/gl-accounts?page=${page}&size=${size}`).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  listGlAccountTypes(page = 0, size = 500): Observable<GlAccountType[]> {
    return this.apiService.get<any>(`/common/accounting/gl-account-types?page=${page}&size=${size}`).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  createGlAccount(payload: GlAccount): Observable<GlAccount> {
    return this.apiService.post<any>('/common/accounting/gl-accounts', payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updateGlAccount(id: number, payload: GlAccount): Observable<GlAccount> {
    return this.apiService.put<any>(`/common/accounting/gl-accounts/${encodeURIComponent(String(id))}`, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  deleteGlAccount(id: number): Observable<void> {
    return this.apiService.delete<any>(`/common/accounting/gl-accounts/${encodeURIComponent(String(id))}`).pipe(
      map((res) => res?.data ?? res)
    );
  }
}
