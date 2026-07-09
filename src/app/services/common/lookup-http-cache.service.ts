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
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

interface CachedLookupResponse {
  expiresAt: number;
  response: HttpResponse<unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class LookupHttpCacheService {
  private static readonly MAX_ENTRIES = 200;

  private readonly responses = new Map<string, CachedLookupResponse>();
  private readonly inflightRequests = new Map<string, Observable<unknown>>();

  get(key: string): HttpResponse<unknown> | null {
    const cached = this.responses.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.responses.delete(key);
      return null;
    }

    return cached.response.clone();
  }

  set(key: string, response: HttpResponse<unknown>, ttlMs: number): void {
    this.responses.set(key, {
      expiresAt: Date.now() + ttlMs,
      response: response.clone(),
    });
    this.trim();
  }

  getInflight<T>(key: string): Observable<T> | null {
    return (this.inflightRequests.get(key) as Observable<T> | undefined) ?? null;
  }

  setInflight<T>(key: string, request$: Observable<T>): void {
    this.inflightRequests.set(key, request$ as Observable<unknown>);
  }

  clearInflight(key: string): void {
    this.inflightRequests.delete(key);
  }

  clear(): void {
    this.responses.clear();
    this.inflightRequests.clear();
  }

  private trim(): void {
    while (this.responses.size > LookupHttpCacheService.MAX_ENTRIES) {
      const oldestKey = this.responses.keys().next().value;
      if (!oldestKey) {
        return;
      }
      this.responses.delete(oldestKey);
    }
  }
}
