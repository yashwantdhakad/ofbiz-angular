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
export class ReplenishmentService {
  constructor(private apiService: ApiService) {}

  runMrp(facilityId?: string, horizonDays?: number): Observable<any> {
    return this.apiService.post<any>('/common/replenishment/runs', {
      facilityId: facilityId || null,
      horizonDays: horizonDays ?? null,
    }).pipe(
      map((res) => res?.data ?? res)
    );
  }

  listRuns(page: number, size: number): Observable<any> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    return this.apiService.get<any>(`/common/replenishment/runs?${params.toString()}`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        const items = [data?.resultList, data?.documentList]
          .find((candidate: any) => Array.isArray(candidate)) ?? [];
        return {
          items,
          total: Number(data?.totalCount ?? items.length),
        };
      })
    );
  }

  listRequirements(page: number, size: number, facilityId?: string, requirementTypeId?: string): Observable<any> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (facilityId) {
      params.set('facilityId', facilityId);
    }
    if (requirementTypeId) {
      params.set('requirementTypeId', requirementTypeId);
    }
    return this.apiService.get<any>(`/common/replenishment/requirements?${params.toString()}`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        const items = [data?.resultList, data?.documentList]
          .find((candidate: any) => Array.isArray(candidate)) ?? [];
        return {
          items,
          total: Number(data?.totalCount ?? items.length),
        };
      })
    );
  }
}
