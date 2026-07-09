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
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, HttpRequest, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TokenInterceptor, tokenInterceptorFn } from './token.interceptor';
import { NavigationService } from './navigation.service';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';

describe('TokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let navigationSpy: jasmine.SpyObj<NavigationService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/current' });
    navigationSpy = jasmine.createSpyObj('NavigationService', ['setLastUrl']);
    authSpy = jasmine.createSpyObj('AuthService', ['refreshToken']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: TokenInterceptor,
          multi: true,
        },
        { provide: Router, useValue: routerSpy },
        { provide: NavigationService, useValue: navigationSpy },
        { provide: AuthService, useValue: authSpy },
        TokenStorageService,
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    httpMock.verify();
    tokenStorage.clearToken();
  });

  it('should add token header', () => {
    tokenStorage.setToken('ABC');
    http.get('/data').subscribe();

    const req = httpMock.expectOne('/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ABC');
  });

  it('should handle unauthorized error', () => {
    tokenStorage.setToken('ABC');
    authSpy.refreshToken.and.returnValue(throwError(() => new Error('refresh failed')));

    http.get('/data').subscribe({
      error: () => {
        expect(tokenStorage.getToken()).toBeNull();
        expect(navigationSpy.setLastUrl).toHaveBeenCalledWith('/current');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
      },
    });

    const req = httpMock.expectOne('/data');
    req.flush('err', { status: 401, statusText: 'Unauthorized' });
  });

  it('should preserve existing authorization and tenant headers', () => {
    tokenStorage.setToken('ABC');

    http.get('/data', {
      headers: {
        Authorization: 'Bearer EXISTING',
      },
    }).subscribe();

    const req = httpMock.expectOne('/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer EXISTING');
    req.flush({});
  });

  it('should refresh the token and retry a failed request', () => {
    tokenStorage.setToken('OLD');
    tokenStorage.setRefreshToken('REFRESH');
    authSpy.refreshToken.and.returnValue(of({
      accessToken: 'NEW',
      refreshToken: 'REFRESH-2',
      userLoginId: 'demo',
      roles: ['ADMIN'],
      permissions: ['INV_VIEW'],
      requirePasswordChange: true,
    }));

    let responseBody: unknown;
    http.get('/data').subscribe((response) => {
      responseBody = response;
    });

    const firstReq = httpMock.expectOne('/data');
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer OLD');
    firstReq.flush('err', { status: 401, statusText: 'Unauthorized' });

    const retriedReq = httpMock.expectOne('/data');
    expect(retriedReq.request.headers.get('Authorization')).toBe('Bearer NEW');
    retriedReq.flush({ ok: true });

    expect(responseBody).toEqual({ ok: true });
    expect(tokenStorage.getToken()).toBe('NEW');
    expect(tokenStorage.getRefreshToken()).toBe('REFRESH-2');
    expect(tokenStorage.getUserLoginId()).toBe('demo');
    expect(tokenStorage.getRoles()).toEqual(['ADMIN']);
    expect(tokenStorage.getPermissions()).toEqual(['INV_VIEW']);
    expect(tokenStorage.isRequirePasswordChange()).toBeTrue();
  });

  it('should replace stale authorization and tenant headers when retrying after refresh', () => {
    tokenStorage.setToken('OLD');
    tokenStorage.setRefreshToken('REFRESH');
    authSpy.refreshToken.and.returnValue(of({
      accessToken: 'NEW',
      refreshToken: 'REFRESH-2',
    }));

    http.get('/data', {
      headers: {
        Authorization: 'Bearer OLD',
      },
    }).subscribe();

    const firstReq = httpMock.expectOne('/data');
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer OLD');
    firstReq.flush('err', { status: 401, statusText: 'Unauthorized' });

    const retriedReq = httpMock.expectOne('/data');
    expect(retriedReq.request.headers.get('Authorization')).toBe('Bearer NEW');
    retriedReq.flush({});
  });

  it('should logout when refresh response is missing tokens', () => {
    tokenStorage.setToken('OLD');
    tokenStorage.setRefreshToken('REFRESH');
    authSpy.refreshToken.and.returnValue(of({ accessToken: 'NEW' }));

    http.get('/data').subscribe({
      error: () => {
        expect(tokenStorage.getToken()).toBeNull();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
      },
    });

    const req = httpMock.expectOne('/data');
    req.flush('err', { status: 401, statusText: 'Unauthorized' });
  });

  it('should not attempt refresh for non-401 errors', () => {
    tokenStorage.setToken('ABC');

    http.get('/data').subscribe({
      error: () => {
        expect(authSpy.refreshToken).not.toHaveBeenCalled();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne('/data');
    req.flush('err', { status: 500, statusText: 'Server Error' });
  });

  it('should treat refresh endpoint as auth request in the function interceptor', () => {
    tokenStorage.setToken('ABC');
    const request = new HttpRequest('POST', '/security/auth/refresh', {});
    const unauthorized = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      url: '/security/auth/refresh',
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => unauthorized));

    TestBed.runInInjectionContext(() => {
      tokenInterceptorFn(request, next).subscribe({
        error: () => {
          expect(next).toHaveBeenCalled();
          const forwardedRequest = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
          expect(forwardedRequest.headers.has('Authorization')).toBeFalse();
          expect(authSpy.refreshToken).not.toHaveBeenCalled();
          expect(tokenStorage.getToken()).toBeNull();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
        },
      });
    });
  });

  it('should refresh and retry with the function interceptor', () => {
    tokenStorage.setToken('OLD');
    tokenStorage.setRefreshToken('REFRESH');
    authSpy.refreshToken.and.returnValue(of({
      accessToken: 'NEW',
      refreshToken: 'REFRESH-2',
      roles: ['ADMIN'],
      permissions: ['VIEW'],
    }));
    const request = new HttpRequest('GET', '/data');
    let callCount = 0;
    const next = jasmine.createSpy('next').and.callFake((req: HttpRequest<unknown>) => {
      callCount += 1;
      if (callCount === 1) {
        return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', url: req.url }));
      }
      return of(new HttpResponse({ status: 200, body: { ok: true } }));
    });
    let responseBody: unknown;

    TestBed.runInInjectionContext(() => {
      tokenInterceptorFn(request, next).subscribe((response) => {
        responseBody = (response as HttpResponse<unknown>).body;
      });
    });

    expect(callCount).toBe(2);
    const retriedRequest = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(retriedRequest.headers.get('Authorization')).toBe('Bearer NEW');
    expect(responseBody).toEqual({ ok: true });
  });
});
