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
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { HomeGuard, homeGuardFn } from './home.guard';
import { AuthService } from './services/common/auth.service'; // Ensure the path is correct
import { NavigationService } from './services/common/navigation.service';

describe('HomeGuard', () => {
  let guard: HomeGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let route: ActivatedRouteSnapshot;
  let state: RouterStateSnapshot;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isRequirePasswordChange']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['setLastUrl']);

    TestBed.configureTestingModule({
      providers: [
        HomeGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
      ],
    });

    guard = TestBed.inject(HomeGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
    route = new ActivatedRouteSnapshot();
    state = { url: '/home' } as RouterStateSnapshot;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow activation if the user is authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.isRequirePasswordChange.and.returnValue(false);
    expect(guard.canActivate(route, state)).toBe(true);
  });

  it('should not allow activation and navigate to login if the user is not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    expect(guard.canActivate(route, state)).toBe(false);
    expect(navigationService.setLastUrl).toHaveBeenCalledWith('/home');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect to change-password when password change is required', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.isRequirePasswordChange.and.returnValue(true);

    expect(guard.canActivate(route, state)).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/change-password']);
  });

  it('should allow change-password route when password change is required', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.isRequirePasswordChange.and.returnValue(true);
    state = { url: '/change-password' } as RouterStateSnapshot;

    expect(guard.canActivate(route, state)).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should evaluate functional guard with the same redirect rules', () => {
    authService.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => homeGuardFn(route, state));

    expect(result).toBe(false);
    expect(navigationService.setLastUrl).toHaveBeenCalledWith('/home');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
