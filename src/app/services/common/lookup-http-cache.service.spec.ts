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
import { HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { LookupHttpCacheService } from './lookup-http-cache.service';

describe('LookupHttpCacheService', () => {
  let service: LookupHttpCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LookupHttpCacheService],
    });
    service = TestBed.inject(LookupHttpCacheService);
  });

  it('should return null for get when key is not cached', () => {
    expect(service.get('nonexistent')).toBeNull();
  });

  it('should set and get cached lookup response correctly', () => {
    const response = new HttpResponse({ body: { data: 'test' } });
    service.set('key-1', response, 10000);

    const cached = service.get('key-1');
    expect(cached).toBeTruthy();
    expect(cached?.body).toEqual({ data: 'test' });
  });

  it('should delete and return null for expired lookup response', () => {
    const response = new HttpResponse({ body: { data: 'expired' } });
    service.set('key-2', response, -1000); // already expired

    const cached = service.get('key-2');
    expect(cached).toBeNull();
  });

  it('should trim oldest entries when MAX_ENTRIES is exceeded', () => {
    const response = new HttpResponse({ body: 'val' });
    
    // Set 201 entries (MAX_ENTRIES is 200)
    for (let i = 1; i <= 201; i++) {
      service.set(`key-${i}`, response, 10000);
    }

    // Key-1 (the oldest) should have been trimmed (deleted)
    expect(service.get('key-1')).toBeNull();
    // Key-201 should still be present
    expect(service.get('key-201')).toBeTruthy();
  });

  it('should manage inflight requests correctly', () => {
    const request$ = of({ result: 'ok' });
    expect(service.getInflight('req-1')).toBeNull();

    service.setInflight('req-1', request$);
    expect(service.getInflight('req-1')).toBe(request$);

    service.clearInflight('req-1');
    expect(service.getInflight('req-1')).toBeNull();
  });

  it('should clear all caches on clear', () => {
    const response = new HttpResponse({ body: 'test' });
    service.set('key-1', response, 10000);
    service.setInflight('req-1', of('ok'));

    service.clear();

    expect(service.get('key-1')).toBeNull();
    expect(service.getInflight('req-1')).toBeNull();
  });
});
