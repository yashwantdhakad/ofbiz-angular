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

export interface AsyncJob {
  id: number;
  serviceType: string;
  status: string;
  operationType?: string;
  attemptCount?: number;
  nextRetryAt?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  cancellable: boolean;
}

export interface AsyncJobListResponse {
  items: AsyncJob[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class AsyncServiceService {
  constructor(private apiService: ApiService) {}

  listJobs(
    sourceSystem: 'WMS' | 'OMS',
    page: number,
    size: number,
    serviceType?: string,
    status?: string
  ): Observable<AsyncJobListResponse> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    if (serviceType && serviceType.trim().length > 0) {
      params.set('serviceType', serviceType.trim());
    }
    if (status && status.trim().length > 0) {
      params.set('status', status.trim());
    }
    return this.apiService.getWms<AsyncJobListResponse>(`/async-jobs?${params.toString()}`);
  }

  cancelJob(sourceSystem: 'WMS' | 'OMS', serviceType: string, id: number): Observable<AsyncJob> {
    const safeServiceType = encodeURIComponent(serviceType.toLowerCase().replaceAll('_', '-'));
    return this.apiService.postWms<AsyncJob>(`/async-jobs/${safeServiceType}/${id}/cancel`, {});
  }
}
