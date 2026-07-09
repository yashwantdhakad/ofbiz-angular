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
import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NavigationService } from './navigation.service';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';
import { TokenRefreshCoordinatorService } from './token-refresh-coordinator.service';

export const tokenInterceptorFn: HttpInterceptorFn = (
  request: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const router = inject(Router);
  const navigationService = inject(NavigationService);
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const tokenRefreshCoordinator = inject(TokenRefreshCoordinatorService);

  const clonedRequest = withAuthHeader(request, tokenStorage);
  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) =>
      handleAuthErrorFn(error, request, next, router, navigationService, tokenStorage, authService, tokenRefreshCoordinator)
    )
  );
};

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private navigationService: NavigationService,
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    private tokenRefreshCoordinator: TokenRefreshCoordinatorService
  ) {}

  /**
   * Intercepts HTTP requests to add an authorization header and handle errors.
   * @param request - The outgoing HTTP request.
   * @param next - The next handler in the chain.
   * @returns An observable of the HTTP event.
   */
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const clonedRequest = withAuthHeader(request, this.tokenStorage);

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) =>
        handleAuthErrorClass(error, request, next, this.router, this.navigationService, this.tokenStorage, this.authService, this.tokenRefreshCoordinator)
      )
    );
  }
}

function withAuthHeader(
  request: HttpRequest<any>,
  tokenStorage: TokenStorageService
): HttpRequest<any> {
  const token = tokenStorage.getToken();
  const hasAuthHeader = request.headers.has('Authorization');
  const authRequest = isAuthRequest(request);
  const setHeaders: Record<string, string> = {};
  if (token && !hasAuthHeader && !authRequest) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }
  return Object.keys(setHeaders).length > 0 ? request.clone({ setHeaders }) : request;
}

function withRefreshedAuthHeader(
  request: HttpRequest<any>,
  tokenStorage: TokenStorageService
): HttpRequest<any> {
  return withAuthHeader(
    request.clone({
      headers: request.headers.delete('Authorization'),
    }),
    tokenStorage
  );
}

function handleAuthError(
  error: HttpErrorResponse,
  router: Router,
  navigationService: NavigationService,
  tokenStorage: TokenStorageService,
  tokenRefreshCoordinator: TokenRefreshCoordinatorService
): Observable<never> {
  forceLogout(router, navigationService, tokenStorage, tokenRefreshCoordinator);
  return throwError(() => error);
}

function handleAuthErrorFn(
  error: HttpErrorResponse,
  originalRequest: HttpRequest<any>,
  next: HttpHandlerFn,
  router: Router,
  navigationService: NavigationService,
  tokenStorage: TokenStorageService,
  authService: AuthService,
  tokenRefreshCoordinator: TokenRefreshCoordinatorService
): Observable<HttpEvent<any>> {
  if (error.status !== 401) {
    return throwError(() => error);
  }
  if (isAuthRequest(originalRequest)) {
    return handleAuthError(error, router, navigationService, tokenStorage, tokenRefreshCoordinator);
  }
  return tokenRefreshCoordinator.refreshAccessToken(authService, tokenStorage).pipe(
    switchMap(() => next(withRefreshedAuthHeader(originalRequest, tokenStorage))),
    catchError(() => handleAuthError(error, router, navigationService, tokenStorage, tokenRefreshCoordinator))
  );
}

function handleAuthErrorClass(
  error: HttpErrorResponse,
  originalRequest: HttpRequest<any>,
  next: HttpHandler,
  router: Router,
  navigationService: NavigationService,
  tokenStorage: TokenStorageService,
  authService: AuthService,
  tokenRefreshCoordinator: TokenRefreshCoordinatorService
): Observable<HttpEvent<any>> {
  if (error.status !== 401) {
    return throwError(() => error);
  }
  if (isAuthRequest(originalRequest)) {
    return handleAuthError(error, router, navigationService, tokenStorage, tokenRefreshCoordinator);
  }
  return tokenRefreshCoordinator.refreshAccessToken(authService, tokenStorage).pipe(
    switchMap(() => next.handle(withRefreshedAuthHeader(originalRequest, tokenStorage))),
    catchError(() => handleAuthError(error, router, navigationService, tokenStorage, tokenRefreshCoordinator))
  );
}

function isAuthRequest(request: HttpRequest<any>): boolean {
  const url = request.url || '';
  return url.includes('/security/auth/login') ||
    url.includes('/security/auth/refresh') ||
    url.includes('/auth/token') ||
    url.includes('/auth/refresh-token');
}

function forceLogout(
  router: Router,
  navigationService: NavigationService,
  tokenStorage: TokenStorageService,
  tokenRefreshCoordinator: TokenRefreshCoordinatorService
): void {
  navigationService.setLastUrl(router.url);
  tokenRefreshCoordinator.reset();
  tokenStorage.clearToken();
  router.navigate(['/login']);
}
