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
import { HttpBackend, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiConfigService } from './api-config.service';
import { ApiLatencyReporterService, ApiLatencySample } from './api-latency-reporter.service';
import { TokenStorageService } from './token-storage.service';

describe('ApiLatencyReporterService', () => {
  let service: ApiLatencyReporterService;
  let backend: jasmine.SpyObj<HttpBackend>;
  let apiConfig: jasmine.SpyObj<ApiConfigService>;
  let tokenStorage: jasmine.SpyObj<TokenStorageService>;
  let originalConfig: typeof environment.apiLatencyLogging;

  const sample: ApiLatencySample = {
    requestId: 'REQ-1',
    method: 'GET',
    path: '/common/products',
    totalMs: 1500,
    backendMs: 900,
    networkOverheadMs: 600,
    status: 200,
    route: '/products',
    userAgent: 'Chrome',
  };

  beforeEach(() => {
    originalConfig = environment.apiLatencyLogging;
    environment.apiLatencyLogging = {
      enabled: true,
      slowThresholdMs: 1000,
      reportSlowRequests: true,
      reportEndpoint: '/observability/frontend-latency',
    };
    backend = jasmine.createSpyObj<HttpBackend>('HttpBackend', ['handle']);
    apiConfig = jasmine.createSpyObj<ApiConfigService>('ApiConfigService', ['buildUrl']);
    tokenStorage = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', ['getToken']);
    backend.handle.and.returnValue(of(new HttpResponse({ status: 204 })));
    apiConfig.buildUrl.and.returnValue('/api/observability/frontend-latency');
    tokenStorage.getToken.and.returnValue('TOKEN');

    TestBed.configureTestingModule({
      providers: [
        ApiLatencyReporterService,
        { provide: HttpBackend, useValue: backend },
        { provide: ApiConfigService, useValue: apiConfig },
        { provide: TokenStorageService, useValue: tokenStorage },
      ],
    });

    service = TestBed.inject(ApiLatencyReporterService);
  });

  afterEach(() => {
    environment.apiLatencyLogging = originalConfig;
  });

  it('posts latency samples with auth header when reporting is enabled', () => {
    service.report(sample);

    expect(apiConfig.buildUrl).toHaveBeenCalledWith('/observability/frontend-latency');
    expect(backend.handle).toHaveBeenCalled();
    const request = backend.handle.calls.mostRecent().args[0] as HttpRequest<ApiLatencySample>;
    expect(request.method).toBe('POST');
    expect(request.url).toBe('/api/observability/frontend-latency');
    expect(request.body).toEqual(sample);
    expect(request.headers.get('Content-Type')).toBe('application/json');
    expect(request.headers.get('Authorization')).toBe('Bearer TOKEN');
  });

  it('omits auth header when no token exists', () => {
    tokenStorage.getToken.and.returnValue(null);

    service.report(sample);

    const request = backend.handle.calls.mostRecent().args[0] as HttpRequest<ApiLatencySample>;
    expect(request.headers.has('Authorization')).toBeFalse();
  });

  it('does not report when disabled or endpoint is missing', () => {
    environment.apiLatencyLogging = { ...environment.apiLatencyLogging, reportSlowRequests: false };
    service.report(sample);

    environment.apiLatencyLogging = { ...environment.apiLatencyLogging, reportSlowRequests: true, reportEndpoint: '' };
    service.report(sample);

    expect(backend.handle).not.toHaveBeenCalled();
  });

  it('swallows reporting transport errors', () => {
    backend.handle.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(() => service.report(sample)).not.toThrow();
  });
});
