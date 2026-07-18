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

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  private readonly TOKEN_KEY = 'token';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_LOGIN_ID_KEY = 'userLoginId';
  private readonly ROLES_KEY = 'roles';
  private readonly PERMISSIONS_KEY = 'permissions';
  // Storage key name only — no credential is stored in this constant.
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords
  private readonly REQUIRE_PASSWORD_CHANGE_KEY = 'requirePasswordChange'; // NOSONAR

  setToken(token: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    this.clearLegacyCookie(this.TOKEN_KEY);
  }

  getToken(): string | null {
    const fromSession = sessionStorage.getItem(this.TOKEN_KEY);
    if (fromSession) {
      return fromSession;
    }
    const fromCookie = this.readLegacyCookie(this.TOKEN_KEY);
    if (fromCookie) {
      sessionStorage.setItem(this.TOKEN_KEY, fromCookie);
      this.clearLegacyCookie(this.TOKEN_KEY);
    }
    return fromCookie;
  }

  setRefreshToken(refreshToken: string): void {
    sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    this.clearLegacyCookie(this.REFRESH_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    const fromSession = sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (fromSession) {
      return fromSession;
    }
    const fromCookie = this.readLegacyCookie(this.REFRESH_TOKEN_KEY);
    if (fromCookie) {
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, fromCookie);
      this.clearLegacyCookie(this.REFRESH_TOKEN_KEY);
    }
    return fromCookie;
  }

  setUserLoginId(userLoginId: string): void {
    sessionStorage.setItem(this.USER_LOGIN_ID_KEY, userLoginId);
    this.clearLegacyCookie(this.USER_LOGIN_ID_KEY);
  }

  getUserLoginId(): string | null {
    const fromSession = sessionStorage.getItem(this.USER_LOGIN_ID_KEY);
    if (fromSession) {
      return fromSession;
    }
    const fromCookie = this.readLegacyCookie(this.USER_LOGIN_ID_KEY);
    if (fromCookie) {
      sessionStorage.setItem(this.USER_LOGIN_ID_KEY, fromCookie);
      this.clearLegacyCookie(this.USER_LOGIN_ID_KEY);
    }
    return fromCookie;
  }

  setRoles(roles: string[]): void {
    sessionStorage.setItem(this.ROLES_KEY, JSON.stringify(roles));
    this.clearLegacyCookie(this.ROLES_KEY);
  }

  getRoles(): string[] {
    const raw = sessionStorage.getItem(this.ROLES_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  setPermissions(permissions: string[]): void {
    sessionStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(permissions));
    this.clearLegacyCookie(this.PERMISSIONS_KEY);
  }

  getPermissions(): string[] {
    const raw = sessionStorage.getItem(this.PERMISSIONS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  setRequirePasswordChange(required: boolean): void {
    sessionStorage.setItem(this.REQUIRE_PASSWORD_CHANGE_KEY, required ? 'true' : 'false');
    this.clearLegacyCookie(this.REQUIRE_PASSWORD_CHANGE_KEY);
  }

  isRequirePasswordChange(): boolean {
    const fromSession = sessionStorage.getItem(this.REQUIRE_PASSWORD_CHANGE_KEY);
    if (fromSession !== null) {
      return fromSession === 'true';
    }
    const fromCookie = this.readLegacyCookie(this.REQUIRE_PASSWORD_CHANGE_KEY);
    if (fromCookie !== null) {
      sessionStorage.setItem(this.REQUIRE_PASSWORD_CHANGE_KEY, fromCookie);
      this.clearLegacyCookie(this.REQUIRE_PASSWORD_CHANGE_KEY);
    }
    return fromCookie === 'true';
  }

  clearToken(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_LOGIN_ID_KEY);
    sessionStorage.removeItem(this.ROLES_KEY);
    sessionStorage.removeItem(this.PERMISSIONS_KEY);
    sessionStorage.removeItem(this.REQUIRE_PASSWORD_CHANGE_KEY);

    this.clearLegacyCookie(this.TOKEN_KEY);
    this.clearLegacyCookie(this.REFRESH_TOKEN_KEY);
    this.clearLegacyCookie(this.USER_LOGIN_ID_KEY);
    this.clearLegacyCookie(this.ROLES_KEY);
    this.clearLegacyCookie(this.PERMISSIONS_KEY);
    this.clearLegacyCookie(this.REQUIRE_PASSWORD_CHANGE_KEY);
  }

  private clearStoredAuthorizationState(key: string): void {
    sessionStorage.removeItem(key);
    this.clearLegacyCookie(key);
  }

  private readLegacyCookie(key: string): string | null {
    const match = new RegExp('(^| )' + key + '=([^;]+)').exec(document.cookie);
    return match ? decodeURIComponent(match[2]) : null;
  }

  private clearLegacyCookie(key: string): void {
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
  }

}
