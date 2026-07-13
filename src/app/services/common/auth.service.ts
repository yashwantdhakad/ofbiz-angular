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
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { TokenStorageService } from './token-storage.service';
import { ApiConfigService } from './api-config.service';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export const PERMISSION_BYPASS = new InjectionToken<boolean>('PERMISSION_BYPASS', {
  providedIn: 'root',
  factory: () => environment.permissionBypass,
});

export interface LoginSessionResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
  userLoginId?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
  requirePasswordChange?: boolean | null;
}

interface OfbizTokenResponse {
  data?: {
    access_token?: string;
    refresh_token?: string;
    roles?: string[];
    permissions?: string[];
    requirePasswordChange?: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private static readonly SUPER_ADMIN_ROLES = new Set(['APP_SUPER_ADMIN', 'SUPER', 'FULLADMIN']);

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private apiConfig: ApiConfigService,
    @Inject(PERMISSION_BYPASS) private permissionBypass: boolean
  ) {}

  /**
   * Logs in the user by making an HTTP POST request to the login endpoint.
   * @param username - The username of the user.
   * @param password - The password of the user.
   * @returns An observable of the HTTP response.
   */
  login(userLoginId: string, password: string): Observable<any> {
    const url = this.apiConfig.buildUrl('/auth/token');
    const credentials = btoa(`${userLoginId}:${password}`);
    return this.http.post<OfbizTokenResponse>(url, null, {
      headers: new HttpHeaders({ Authorization: `Basic ${credentials}` }),
    }).pipe(map((response) => this.toLoginSession(response, userLoginId)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const url = this.apiConfig.buildUrl('/common/users/change-password');
    return this.http.post(url, { currentPassword, newPassword });
  }

  /**
   * Logs out the user by removing the token from session storage and navigating to the login page.
   */
  logout(): void {
    this.tokenStorage.clearToken();
    this.router.navigateByUrl('/login');
  }

  storeLoginSession(response: LoginSessionResponse | null | undefined): boolean {
    const accessToken = this.readResponseString(response?.accessToken);
    if (accessToken) {
      this.tokenStorage.setToken(accessToken);
    }
    const refreshToken = this.readResponseString(response?.refreshToken);
    if (refreshToken) {
      this.tokenStorage.setRefreshToken(refreshToken);
    }
    const userLoginId = this.readResponseString(response?.userLoginId);
    if (userLoginId) {
      this.tokenStorage.setUserLoginId(userLoginId);
    }
    this.tokenStorage.setRoles(this.normalizeValues(response?.roles));
    this.tokenStorage.setPermissions(this.normalizeValues(response?.permissions));

    const requirePasswordChange = Boolean(response?.requirePasswordChange);
    this.setRequirePasswordChange(requirePasswordChange);
    return requirePasswordChange;
  }

  setRequirePasswordChange(required: boolean): void {
    this.tokenStorage.setRequirePasswordChange(required);
  }

  getUserLoginId(): string | null {
    return this.tokenStorage.getUserLoginId();
  }

  isRequirePasswordChange(): boolean {
    return this.tokenStorage.isRequirePasswordChange();
  }

  isSuperAdmin(): boolean {
    if (this.permissionBypass) {
      return true;
    }
    return this.getRolesFromClaims().some((role) => AuthService.SUPER_ADMIN_ROLES.has(role));
  }

  hasPermission(permission: string): boolean {
    if (this.permissionBypass) {
      return true;
    }
    if (!permission) {
      return true;
    }
    if (permission === 'SUPER_ADMIN_ONLY') {
      return this.isSuperAdmin();
    }
    if (this.isSuperAdmin()) {
      return true;
    }
    return this.getPermissionsFromClaims().includes(permission) || this.getRolesFromClaims().includes(permission);
  }

  hasAnyPermission(permissions: string[] | null | undefined): boolean {
    if (!permissions || permissions.length === 0) {
      return true;
    }
    const normalized = this.normalizeValues(permissions);
    if (normalized.length === 0) {
      return true;
    }
    return normalized.some((permission) => this.hasPermission(permission));
  }

  /**
   * Checks if the user is authenticated by verifying the presence of a token in session storage.
   * @returns True if the user is authenticated, false otherwise.
   */
  isAuthenticated(): boolean {
    const token = this.tokenStorage.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token is missing'));
    }
    const url = this.apiConfig.buildUrl('/auth/refresh-token');
    return this.http.post<OfbizTokenResponse>(url, null, {
      headers: new HttpHeaders({ 'Refresh-Token': refreshToken }),
    }).pipe(map((response) => this.toLoginSession(response, this.getUserLoginId())));
  }

  private toLoginSession(
    response: OfbizTokenResponse,
    userLoginId: string | null
  ): LoginSessionResponse {
    return {
      accessToken: response?.data?.access_token ?? null,
      refreshToken: response?.data?.refresh_token ?? null,
      userLoginId,
      roles: Array.isArray(response?.data?.roles) ? response.data!.roles! : [],
      permissions: Array.isArray(response?.data?.permissions) ? response.data!.permissions! : [],
      requirePasswordChange: response?.data?.requirePasswordChange ?? false,
    };
  }

  private readClaim(claimName: string): string[] {
    return this.normalizeValues(this.readClaims()?.[claimName]);
  }

  private getRolesFromClaims(): string[] {
    return this.readClaim('roles');
  }

  private getPermissionsFromClaims(): string[] {
    return this.readClaim('permissions');
  }

  private readStringClaim(claimName: string): string | null {
    const value = this.readClaims()?.[claimName];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readClaims(): Record<string, unknown> | null {
    const token = this.tokenStorage.getToken();
    if (!token) {
      return null;
    }
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    try {
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        normalizedPayload.length + (4 - (normalizedPayload.length % 4)) % 4,
        '='
      );
      const claims = JSON.parse(atob(paddedPayload));
      return claims && typeof claims === 'object' ? claims as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const claims = this.readClaimsFromToken(token);
    const exp = claims?.['exp'];
    return typeof exp === 'number' && exp <= Math.floor(Date.now() / 1000);
  }

  private readClaimsFromToken(token: string): Record<string, unknown> | null {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    try {
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        normalizedPayload.length + (4 - (normalizedPayload.length % 4)) % 4,
        '='
      );
      const claims = JSON.parse(atob(paddedPayload));
      return claims && typeof claims === 'object' ? claims as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }

  private normalizeValues(values: unknown): string[] {
    const rawValues = typeof values === 'string'
      ? values.split(',')
      : values;
    if (!Array.isArray(rawValues)) {
      return [];
    }
    return rawValues
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  private readResponseString(value: string | null | undefined): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }
}
