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
import { inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';

import { LookupHttpCacheService } from './lookup-http-cache.service';

const LOOKUP_CACHE_TTL_MS = 15 * 60 * 1000;

const CACHEABLE_LOOKUP_PATHS = [
  '/common/lookups/enumerations',
  '/common/lookups/enumeration-types',
  '/common/lookups/status-items',
  '/common/lookups/uoms',
  '/common/lookups/geos',
  '/common/lookups/geo-assocs',
  '/common/lookups/order-item-types',
  '/common/lookups/product-category-types',
  '/common/lookups/product-feature-appl-types',
  '/common/lookups/product-price-types',
  '/common/lookups/good-identification-types',
  '/common/lookups/product-types',
  '/common/lookups/role-types',
  '/common/lookups/shipment-method-types',
  '/common/lookups/shipment-types',
];

export const lookupCacheInterceptorFn: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const cache = inject(LookupHttpCacheService);

  if (!isCacheableLookupRequest(request)) {
    return next(request);
  }

  const cacheKey = buildCacheKey(request);
  const cached = cache.get(cacheKey);
  if (cached) {
    return of(cached);
  }

  const inflight = cache.getInflight<HttpEvent<unknown>>(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request$ = next(request).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(cacheKey, event, LOOKUP_CACHE_TTL_MS);
      }
    }),
    finalize(() => cache.clearInflight(cacheKey)),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  cache.setInflight(cacheKey, request$);
  return request$;
};

function isCacheableLookupRequest(request: HttpRequest<unknown>): boolean {
  if (request.method !== 'GET' || request.responseType !== 'json') {
    return false;
  }

  const cacheControl = request.headers.get('Cache-Control')?.toLowerCase() || '';
  if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
    return false;
  }

  const url = request.urlWithParams.toLowerCase();
  return CACHEABLE_LOOKUP_PATHS.some((path) => url.includes(path));
}

function buildCacheKey(request: HttpRequest<unknown>): string {
  return request.urlWithParams;
}
