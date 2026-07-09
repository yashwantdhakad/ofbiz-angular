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
import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './services/common/auth.service';
import { NavigationService } from './services/common/navigation.service';
import { PATH_PERMISSION_MAP } from './config/path-permission-map';

export const permissionGuardFn: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const navigationService = inject(NavigationService);
  return evaluatePermissionGuard(authService, router, navigationService, state);
};

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private navigationService: NavigationService
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return evaluatePermissionGuard(this.authService, this.router, this.navigationService, state);
  }
}

function evaluatePermissionGuard(
  authService: AuthService,
  router: Router,
  navigationService: NavigationService,
  state: RouterStateSnapshot
): boolean {
  if (!authService.isAuthenticated()) {
    navigationService.setLastUrl(state.url);
    router.navigate(['/login']);
    return false;
  }
  const cleanPath = state.url.split('?')[0];
  const requiredPermission = resolveRequiredPermission(cleanPath);
  if (!requiredPermission || authService.hasPermission(requiredPermission)) {
    return true;
  }
  router.navigate(['/forbidden'], { queryParams: { from: cleanPath } });
  return false;
}

function resolveRequiredPermission(path: string): string | null {
  if (PATH_PERMISSION_MAP[path]) {
    return PATH_PERMISSION_MAP[path];
  }
  const firstSegmentPath = '/' + path.replace(/^\//, '').split('/')[0];
  return PATH_PERMISSION_MAP[firstSegmentPath] ?? null;
}
