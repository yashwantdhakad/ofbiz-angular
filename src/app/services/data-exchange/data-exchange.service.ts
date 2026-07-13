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

@Injectable({
  providedIn: 'root',
})
export class DataExchangeService {
  constructor(private apiService: ApiService) {}

  listJobs(page: number, size: number, jobType?: string): Observable<any> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (jobType) {
      params.set('jobType', jobType);
    }
    return this.apiService.get(`/common/data-exchange/jobs?${params.toString()}`);
  }

  exportCsv(entityType: string): Observable<any> {
    return this.apiService.post('/common/data-exchange/exports', { entityType });
  }

  validateCsv(entityType: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('entityType', entityType);
    formData.append('uploadedFile', file);
    return this.apiService.postFormData('/common/data-exchange/validations', formData);
  }

  importCsv(entityType: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('entityType', entityType);
    formData.append('uploadedFile', file);
    return this.apiService.postFormData('/common/data-exchange/imports', formData);
  }

  downloadResult(jobId: number): Observable<Blob> {
    return this.downloadCsv(`/common/data-exchange/jobs/${encodeURIComponent(String(jobId))}/result`);
  }

  downloadErrors(jobId: number): Observable<Blob> {
    return this.downloadCsv(`/common/data-exchange/jobs/${encodeURIComponent(String(jobId))}/errors`);
  }

  downloadTemplate(entityType: string): Observable<Blob> {
    return this.downloadCsv(`/common/data-exchange/templates/${encodeURIComponent(entityType)}`);
  }

  cancelJob(jobId: number): Observable<any> {
    return this.apiService.post(`/common/data-exchange/jobs/${encodeURIComponent(String(jobId))}/cancel`, {});
  }

  private downloadCsv(endpoint: string): Observable<Blob> {
    return this.apiService.get<any>(endpoint).pipe(
      map((response: any) => {
        const data = response?.data ?? response;
        return base64ToBlob(data?.fileBytes, data?.mimeType || 'text/csv');
      })
    );
  }
}
