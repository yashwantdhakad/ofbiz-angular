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
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { ApiConfigService } from './api-config.service';
import { TokenStorageService } from './token-storage.service';

export interface ApiLatencySample {
  requestId: string;
  method: string;
  path: string;
  totalMs: number;
  backendMs: number | null;
  networkOverheadMs: number | null;
  status: number;
  route: string;
  userAgent: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiLatencyReporterService {
  private readonly http: HttpClient;

  constructor(
    httpBackend: HttpBackend,
    private apiConfig: ApiConfigService,
    private tokenStorage: TokenStorageService
  ) {
    this.http = new HttpClient(httpBackend);
  }

  report(sample: ApiLatencySample): void {
    const config = environment.apiLatencyLogging;
    if (!config?.reportSlowRequests || !config.reportEndpoint) {
      return;
    }

    const token = this.tokenStorage.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    this.http.post(this.apiConfig.buildUrl(config.reportEndpoint), sample, { headers }).pipe(
      catchError(() => EMPTY)
    ).subscribe();
  }
}
