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
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiConfigService {
  readonly baseUrl = this.resolveBaseUrl();

  buildUrl(endpoint: string, baseUrl: string = this.baseUrl): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    if (endpoint.startsWith('/')) {
      return `${baseUrl}${endpoint}`;
    }
    return `${baseUrl}/${endpoint}`;
  }

  private resolveBaseUrl(): string {
    const runtimeBaseUrl = this.readRuntimeBaseUrl();
    if (runtimeBaseUrl) {
      return runtimeBaseUrl;
    }
    if (environment.apiUrl && environment.apiUrl.trim().length > 0) {
      return environment.apiUrl.trim();
    }
    return '/api';
  }

  private readRuntimeBaseUrl(): string | null {
    const runtime = (globalThis as { __env?: { apiUrl?: string } }).__env;
    const apiUrl = runtime?.apiUrl;
    if (!apiUrl || apiUrl.trim().length === 0) {
      return null;
    }
    return apiUrl.trim();
  }
}
