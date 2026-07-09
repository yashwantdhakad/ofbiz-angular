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
import { TestBed } from '@angular/core/testing';
import { HttpEvent, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { apiLatencyInterceptorFn } from './api-latency.interceptor';
import { ApiLatencyReporterService } from './api-latency-reporter.service';
import { environment } from 'src/environments/environment';

describe('apiLatencyInterceptorFn', () => {
  let originalConfig: typeof environment.apiLatencyLogging;
  let warnSpy: jasmine.Spy;
  let reporterSpy: jasmine.SpyObj<ApiLatencyReporterService>;

  beforeEach(() => {
    reporterSpy = jasmine.createSpyObj('ApiLatencyReporterService', ['report']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiLatencyReporterService, useValue: reporterSpy },
      ],
    });
    originalConfig = environment.apiLatencyLogging;
    environment.apiLatencyLogging = {
      enabled: true,
      slowThresholdMs: 0,
      reportSlowRequests: true,
      reportEndpoint: '/oms/api/observability/frontend-latency',
    };
    warnSpy = spyOn(console, 'warn');
  });

  afterEach(() => {
    environment.apiLatencyLogging = originalConfig;
  });

  it('adds a request id and logs backend and total duration for slow API responses', () => {
    const request = new HttpRequest('GET', '/oms/api/common/status-items');
    const handler = jasmine.createSpy('handler').and.callFake((handledRequest: HttpRequest<unknown>) => {
      expect(handledRequest.headers.get('X-Request-Id')).toBeTruthy();
      return of(new HttpResponse({
        body: [],
        headers: new HttpHeaders({ 'X-Backend-Duration-Ms': '25' }),
        status: 200,
      }));
    });

    runInterceptor(request, handler).subscribe();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('Slow API request', jasmine.objectContaining({
      method: 'GET',
      path: '/oms/api/common/status-items',
      status: 200,
      backendMs: 25,
    }));
    expect(reporterSpy.report).toHaveBeenCalledWith(jasmine.objectContaining({
      method: 'GET',
      path: '/oms/api/common/status-items',
      status: 200,
      backendMs: 25,
    }));
  });

  it('bypasses logging when disabled or outside API paths', () => {
    environment.apiLatencyLogging = {
      enabled: false,
      slowThresholdMs: 0,
      reportSlowRequests: true,
      reportEndpoint: '/oms/api/observability/frontend-latency',
    };
    const handler = jasmine.createSpy('handler').and.returnValue(of(new HttpResponse({ body: [] })));

    runInterceptor(new HttpRequest('GET', '/oms/api/common/status-items'), handler).subscribe();

    environment.apiLatencyLogging = {
      enabled: true,
      slowThresholdMs: 0,
      reportSlowRequests: true,
      reportEndpoint: '/oms/api/observability/frontend-latency',
    };
    runInterceptor(new HttpRequest('GET', '/assets/i18n/en.json'), handler).subscribe();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(reporterSpy.report).not.toHaveBeenCalled();
  });

  function runInterceptor(
    request: HttpRequest<unknown>,
    handler: (request: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>
  ): Observable<HttpEvent<unknown>> {
    return TestBed.runInInjectionContext(() => apiLatencyInterceptorFn(request, handler));
  }
});
