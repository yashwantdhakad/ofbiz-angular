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

import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
    sessionStorage.clear();
    document.cookie.split(';').forEach((cookie) => {
      const key = cookie.split('=')[0]?.trim();
      if (key) {
        document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
      }
    });
  });

  function setCookie(key: string, value: string): void {
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/`;
  }

  it('should persist token and refresh token in session storage', () => {
    service.setToken('token-1');
    service.setRefreshToken('refresh-1');
    service.setUserLoginId('admin');
    service.setRequirePasswordChange(true);

    expect(service.getToken()).toBe('token-1');
    expect(service.getRefreshToken()).toBe('refresh-1');
    expect(service.getUserLoginId()).toBe('admin');
    expect(service.isRequirePasswordChange()).toBeTrue();
  });

  it('should migrate legacy cookie values into session storage', () => {
    setCookie('token', 'legacy-token');
    setCookie('refreshToken', 'legacy-refresh');
    setCookie('userLoginId', 'legacy-user');
    setCookie('requirePasswordChange', 'true');
    setCookie('roles', JSON.stringify(['ADMIN']));
    setCookie('permissions', JSON.stringify(['READ']));

    expect(service.getToken()).toBe('legacy-token');
    expect(service.getRefreshToken()).toBe('legacy-refresh');
    expect(service.getUserLoginId()).toBe('legacy-user');
    expect(service.isRequirePasswordChange()).toBeTrue();
    expect(service.getRoles()).toEqual([]);
    expect(service.getPermissions()).toEqual([]);
    expect(sessionStorage.getItem('token')).toBe('legacy-token');
    expect(sessionStorage.getItem('roles')).toBeNull();
    expect(sessionStorage.getItem('permissions')).toBeNull();
  });

  it('should safely handle malformed json and invalid tokens', () => {
    sessionStorage.setItem('roles', 'not-json');
    sessionStorage.setItem('permissions', '{"bad":true}');
    setCookie('token', 'bad-token');

    expect(service.getRoles()).toEqual([]);
    expect(service.getPermissions()).toEqual([]);
  });

  it('should clear all token-related keys from storage and cookies', () => {
    service.setToken('token-1');
    service.setRefreshToken('refresh-1');
    service.setUserLoginId('admin');
    service.setRoles(['ADMIN']);
    service.setPermissions(['READ']);
    service.setRequirePasswordChange(true);

    service.clearToken();

    expect(sessionStorage).toHaveSize(0);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getUserLoginId()).toBeNull();
    expect(service.getRoles()).toEqual([]);
    expect(service.getPermissions()).toEqual([]);
    expect(service.isRequirePasswordChange()).toBeFalse();
  });
});
