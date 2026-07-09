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
import { AuthService } from './services/common/auth.service'; // Ensure the path is correct
import { NavigationService } from './services/common/navigation.service';

export const homeGuardFn: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const navigationService = inject(NavigationService);
  return evaluateHomeGuard(authService, router, navigationService, state);
};

@Injectable({
  providedIn: 'root',
})
export class HomeGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private navigationService: NavigationService
  ) {}

  /**
   * Determines whether the route can be activated.
   * @returns true if the user is authenticated, otherwise redirects to the login page and returns false.
   */
  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return evaluateHomeGuard(this.authService, this.router, this.navigationService, state);
  }
}

function evaluateHomeGuard(
  authService: AuthService,
  router: Router,
  navigationService: NavigationService,
  state: RouterStateSnapshot
): boolean {
  if (authService.isAuthenticated()) {
    if (authService.isRequirePasswordChange() && state.url !== '/change-password') {
      router.navigate(['/change-password']);
      return false;
    }
    return true;
  }
  navigationService.setLastUrl(state.url);
  router.navigate(['/login']);
  return false;
}
