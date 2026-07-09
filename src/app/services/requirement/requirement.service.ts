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
import { ApiService } from '../common/api.service';

@Injectable({
  providedIn: 'root',
})
export class RequirementService {
  constructor(private apiService: ApiService) {}

  searchRequirements(page: number, size: number, facilityId?: string, productId?: string, requirementTypeId?: string): Observable<any> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (facilityId) {
      params.set('facilityId', facilityId);
    }
    if (productId) {
      params.set('productId', productId);
    }
    if (requirementTypeId) {
      params.set('requirementTypeId', requirementTypeId);
    }
    return this.apiService.get<any>(`/common/requirements/search?${params.toString()}`);
  }

  createRequirement(payload: any): Observable<any> {
    return this.apiService.post<any>('/common/requirements', payload);
  }

  getRequirementDetail(id: number | string): Observable<any> {
    return this.apiService.get<any>(`/common/requirements/${encodeURIComponent(String(id))}/detail`);
  }

  approveRequirement(id: number | string, payload: any = {}): Observable<any> {
    return this.apiService.post<any>(`/common/requirements/${encodeURIComponent(String(id))}/approve`, payload || {});
  }

  upsertSupplier(id: number | string, payload: { partyId: string; partyName?: string }): Observable<any> {
    return this.apiService.put<any>(`/common/requirements/${encodeURIComponent(String(id))}/supplier`, payload);
  }

  createPurchaseOrder(id: number | string): Observable<any> {
    return this.apiService.post<any>(`/common/requirements/${encodeURIComponent(String(id))}/create-po`, {});
  }

  createJob(id: number | string): Observable<any> {
    return this.apiService.post<any>(`/common/requirements/${encodeURIComponent(String(id))}/create-job`, {});
  }
}
