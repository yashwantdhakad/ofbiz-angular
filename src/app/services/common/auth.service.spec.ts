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
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, PERMISSION_BYPASS } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { ApiConfigService } from './api-config.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let tokenStorage: TokenStorageService;

  function jwt(claims: Record<string, unknown>): string {
    const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return `header.${payload}.signature`;
  }

  beforeEach(() => {
    const spy = jasmine.createSpyObj('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: spy },
        TokenStorageService,
        ApiConfigService,
        { provide: PERMISSION_BYPASS, useValue: false },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login', () => {
    const mockResponse = { data: { access_token: '12345', refresh_token: 'refresh-1' } };

    service.login('john.doe', 'moqui').subscribe(response => {
      expect(response.accessToken).toBe('12345');
      expect(response.refreshToken).toBe('refresh-1');
      expect(response.userLoginId).toBe('john.doe');
    });

    const req = httpTestingController.expectOne((request) =>
      request.url.endsWith('/auth/token')
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(`Basic ${btoa('john.doe:moqui')}`);
    req.flush(mockResponse);
  });

  it('should check if user is authenticated', () => {
    tokenStorage.setToken('12345');
    expect(service.isAuthenticated()).toBeTrue();

    tokenStorage.clearToken();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should logout', () => {
    tokenStorage.setToken('12345');
    service.logout();
    expect(tokenStorage.getToken()).toBeNull();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('should change password and refresh token using configured endpoints', async () => {
    const changePasswordPromise = firstValueFrom(service.changePassword('old-pass', 'new-pass'));
    const changeReq = httpTestingController.expectOne((request) =>
      request.url.endsWith('/common/users/change-password')
    );
    expect(changeReq.request.method).toBe('POST');
    expect(changeReq.request.body).toEqual({ currentPassword: 'old-pass', newPassword: 'new-pass' });
    changeReq.flush({ ok: true });
    await changePasswordPromise;

    tokenStorage.setRefreshToken('refresh-token');
    tokenStorage.setUserLoginId('john.doe');
    const refreshPromise = firstValueFrom(service.refreshToken());
    const refreshReq = httpTestingController.expectOne((request) =>
      request.url.endsWith('/auth/refresh-token')
    );
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.headers.get('Refresh-Token')).toBe('refresh-token');
    refreshReq.flush({ data: { access_token: 'new-token', refresh_token: 'refresh-2' } });
    const refreshed = await refreshPromise;
    expect(refreshed.accessToken).toBe('new-token');
    expect(refreshed.refreshToken).toBe('refresh-2');
  });

  it('should error when refresh token is missing', async () => {
    tokenStorage.clearToken();
    await expectAsync(firstValueFrom(service.refreshToken())).toBeRejectedWithError('Refresh token is missing');
  });

  it('should store login session fields in one boundary', () => {
    const requirePasswordChange = service.storeLoginSession({
      accessToken: jwt({
        roles: ['APP_SUPER_ADMIN', ' APP_SUPER_ADMIN ', 'ORDER_VIEW'],
        permissions: ['INV_VIEW', ' INV_VIEW ', 'ORDER_VIEW'],
      }),
      refreshToken: 'refresh',
      userLoginId: 'super_admin',
      roles: ['APP_SUPER_ADMIN', ' APP_SUPER_ADMIN ', 'ORDER_VIEW'],
      permissions: ['INV_VIEW', ' INV_VIEW ', 'ORDER_VIEW'],
      requirePasswordChange: true,
    });

    expect(tokenStorage.getToken()).toContain('.signature');
    expect(tokenStorage.getRefreshToken()).toBe('refresh');
    expect(service.getUserLoginId()).toBe('super_admin');
    expect(service.hasPermission('APP_SUPER_ADMIN')).toBeTrue();
    expect(service.hasPermission('INV_VIEW')).toBeTrue();
    expect(service.isRequirePasswordChange()).toBeTrue();
    expect(requirePasswordChange).toBeTrue();
  });

  it('should resolve admin and permission helpers from token claims', () => {
    service.storeLoginSession({
      userLoginId: 'super_admin',
      accessToken: jwt({
      roles: ['APP_SUPER_ADMIN', 'ORDER_VIEW'],
      permissions: ['INV_VIEW'],
      }),
    });

    expect(service.isSuperAdmin()).toBeTrue();
    expect(service.hasPermission('')).toBeTrue();
    expect(service.hasPermission('INV_VIEW')).toBeTrue();
    expect(service.hasPermission('ORDER_VIEW')).toBeTrue();
    expect(service.hasPermission('MISSING')).toBeTrue();
    expect(service.hasPermission('SUPER_ADMIN_ONLY')).toBeTrue();
    expect(service.hasAnyPermission(undefined)).toBeTrue();
    expect(service.hasAnyPermission([])).toBeTrue();
    expect(service.hasAnyPermission([' ', 'INV_VIEW'])).toBeTrue();
    expect(service.hasAnyPermission(['MISSING'])).toBeTrue();
  });

  it('should not treat the user login id as super admin without the role claim', () => {
    service.storeLoginSession({
      userLoginId: 'super_admin',
      accessToken: jwt({
        roles: ['ORDER_VIEW'],
        permissions: ['INV_VIEW'],
      }),
    });

    expect(service.isSuperAdmin()).toBeFalse();
    expect(service.hasPermission('SUPER_ADMIN_ONLY')).toBeFalse();
  });

  it('should fall back to JWT claims when tenant, roles, and permissions are not in storage', () => {
    tokenStorage.clearToken();
    const claims = {
      roles: ['APP_SUPER_ADMIN', 'MFG_VIEW', 'MFG_VIEW'],
      permissions: ['INV_VIEW', ' INV_VIEW ', 'ORDER_VIEW'],
    };
    tokenStorage.setToken(jwt(claims));

    expect(service.hasPermission('MFG_VIEW')).toBeTrue();
    expect(service.hasPermission('ORDER_VIEW')).toBeTrue();
    expect(service.isSuperAdmin()).toBeTrue();
  });

  it('should return safe defaults when the token payload is malformed', () => {
    tokenStorage.clearToken();
    tokenStorage.setToken('header.invalid.signature');

    expect(service.hasPermission('ORDER_VIEW')).toBeFalse();
    expect(service.isSuperAdmin()).toBeFalse();
  });

  it('should treat expired tokens as unauthenticated', () => {
    tokenStorage.clearToken();
    tokenStorage.setToken(jwt({ exp: Math.floor(Date.now() / 1000) - 60 }));

    expect(service.isAuthenticated()).toBeFalse();
  });
});
