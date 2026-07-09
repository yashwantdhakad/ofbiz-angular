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
import { Observable, Subject, of } from 'rxjs';

import { lookupCacheInterceptorFn } from './lookup-cache.interceptor';
import { LookupHttpCacheService } from './lookup-http-cache.service';

describe('lookupCacheInterceptorFn', () => {
  let cache: LookupHttpCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LookupHttpCacheService],
    });
    cache = TestBed.inject(LookupHttpCacheService);
  });

  afterEach(() => {
    cache.clear();
  });

  it('caches lookup GET responses by URL', () => {
    const request = new HttpRequest('GET', '/oms/api/common/lookups/status-items?statusTypeId=ORDER_STATUS');
    const handler = jasmine.createSpy('handler').and.returnValue(of(new HttpResponse({ body: [{ statusId: 'OK' }] })));

    let firstBody: unknown;
    let secondBody: unknown;
    runInterceptor(request, handler).subscribe((event) => {
      if (event instanceof HttpResponse) {
        firstBody = event.body;
      }
    });
    runInterceptor(request, handler).subscribe((event) => {
      if (event instanceof HttpResponse) {
        secondBody = event.body;
      }
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(firstBody).toEqual([{ statusId: 'OK' }]);
    expect(secondBody).toEqual([{ statusId: 'OK' }]);
  });

  it('shares an in-flight lookup request across subscribers', () => {
    const request = new HttpRequest('GET', '/oms/api/common/lookups/product-types');
    const response$ = new Subject<HttpEvent<unknown>>();
    const handler = jasmine.createSpy('handler').and.returnValue(response$.asObservable());

    let firstBody: unknown;
    let secondBody: unknown;
    runInterceptor(request, handler).subscribe((event) => {
      if (event instanceof HttpResponse) {
        firstBody = event.body;
      }
    });
    runInterceptor(request, handler).subscribe((event) => {
      if (event instanceof HttpResponse) {
        secondBody = event.body;
      }
    });

    response$.next(new HttpResponse({ body: [{ productTypeId: 'FINISHED_GOOD' }] }));
    response$.complete();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(firstBody).toEqual([{ productTypeId: 'FINISHED_GOOD' }]);
    expect(secondBody).toEqual([{ productTypeId: 'FINISHED_GOOD' }]);
  });

  it('bypasses non-lookup and no-cache requests', () => {
    const businessRequest = new HttpRequest('GET', '/oms/api/orders');
    const noCacheLookupRequest = new HttpRequest('GET', '/oms/api/common/lookups/status-items', {
      headers: new HttpHeaders({ 'Cache-Control': 'no-cache' }),
    });
    const handler = jasmine.createSpy('handler').and.returnValue(of(new HttpResponse({ body: [] })));

    runInterceptor(businessRequest, handler).subscribe();
    runInterceptor(businessRequest, handler).subscribe();
    runInterceptor(noCacheLookupRequest, handler).subscribe();
    runInterceptor(noCacheLookupRequest, handler).subscribe();

    expect(handler).toHaveBeenCalledTimes(4);
  });

  function runInterceptor(
    request: HttpRequest<unknown>,
    handler: (request: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>
  ): Observable<HttpEvent<unknown>> {
    return TestBed.runInInjectionContext(() => lookupCacheInterceptorFn(request, handler));
  }
});
