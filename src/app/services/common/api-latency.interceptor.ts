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
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { ApiLatencyReporterService } from './api-latency-reporter.service';

export const apiLatencyInterceptorFn: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  if (!isLatencyLoggingEnabled() || !isApiRequest(request)) {
    return next(request);
  }

  const reporter = inject(ApiLatencyReporterService);
  const startedAt = performance.now();
  const requestId = request.headers.get('X-Request-Id') || createRequestId();
  const requestWithId = request.headers.has('X-Request-Id')
    ? request
    : request.clone({ setHeaders: { 'X-Request-Id': requestId } });

  return next(requestWithId).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        logSlowApiRequest(requestWithId, event, startedAt, requestId, reporter);
      }
    })
  );
};

function isLatencyLoggingEnabled(): boolean {
  return Boolean(environment.apiLatencyLogging?.enabled);
}

function isApiRequest(request: HttpRequest<unknown>): boolean {
  const url = request.urlWithParams;
  if (url.includes('/observability/frontend-latency')) {
    return false;
  }
  return url.includes('/oms/api/') || url.includes('/wms/api/') || url.includes('/api/');
}

function logSlowApiRequest(
  request: HttpRequest<unknown>,
  response: HttpResponse<unknown>,
  startedAt: number,
  requestId: string,
  reporter: ApiLatencyReporterService
): void {
  const totalMs = Math.round(performance.now() - startedAt);
  const thresholdMs = environment.apiLatencyLogging?.slowThresholdMs ?? 1000;
  if (totalMs < thresholdMs) {
    return;
  }

  const backendMs = parseDuration(response.headers.get('X-Backend-Duration-Ms'));
  const networkOverheadMs = backendMs == null ? null : Math.max(totalMs - backendMs, 0);
  const sample = {
    requestId,
    method: request.method,
    path: safePath(request.urlWithParams),
    status: response.status,
    totalMs,
    backendMs,
    networkOverheadMs,
    route: location.pathname,
    userAgent: navigator.userAgent.slice(0, 120),
  };

  console.warn('Slow API request', sample);
  reporter.report(sample);
}

function parseDuration(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

let requestIdCounter = 0;

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  requestIdCounter = (requestIdCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now()}-${requestIdCounter.toString(36)}`;
}

function safePath(urlWithParams: string): string {
  const withoutQuery = urlWithParams.split('?')[0] || urlWithParams;
  try {
    return new URL(withoutQuery, location.origin).pathname;
  } catch {
    return withoutQuery.slice(0, 300);
  }
}
