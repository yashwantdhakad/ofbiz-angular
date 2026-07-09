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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { NavigationService } from '@ofbiz/services/common/navigation.service';
import { TokenStorageService } from '@ofbiz/services/common/token-storage.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let router: jasmine.SpyObj<Router>;
  let tokenStorage: jasmine.SpyObj<TokenStorageService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateMock: any;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'storeLoginSession',
    ]);
    const navigationSpy = jasmine.createSpyObj('NavigationService', ['getLastUrl', 'clearLastUrl']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    const tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['clearToken']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError']);
    
    translateMock = {
      instant: (key: string) => key === 'LOGIN_ERROR' ? 'Invalid username or password.' : key,
      get: (key: string) => of(key),
      stream: (key: string) => of(key),
      onLangChange: of({}),
      onTranslationChange: of({}),
      onDefaultLangChange: of({}),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: NavigationService, useValue: navigationSpy },
        { provide: Router, useValue: routerSpy },
        { provide: TokenStorageService, useValue: tokenStorageSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authService.storeLoginSession.and.callFake((response: any) => Boolean(response?.requirePasswordChange));
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    tokenStorage = TestBed.inject(TokenStorageService) as jasmine.SpyObj<TokenStorageService>;
  });

  beforeEach(() => {
    spyOn(console, 'log').and.stub();
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(tokenStorage.clearToken).toHaveBeenCalled();
  });

  it('should initialize form with default values', () => {
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.get('username')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });


  it('should not submit if form is invalid', () => {
    component.loginForm.get('username')?.setValue('');
    component.onSubmit();
    expect(authService.login).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should login and redirect to last URL', fakeAsync(() => {
    const fakeToken = 'valid-token';
    authService.login.and.returnValue(of({
      accessToken: fakeToken,
      refreshToken: 'refresh-token',
      userLoginId: 'john.doe',
      roles: ['ADMIN'],
      permissions: ['PRODUCT_VIEW'],
      requirePasswordChange: false,
    }));
    navigationService.getLastUrl.and.returnValue('/dashboard');

    component.loginForm.setValue({ username: 'john.doe', password: 'moqui' });
    component.onSubmit();
    tick();

    expect(authService.login).toHaveBeenCalledWith('john.doe', 'moqui');
    expect(authService.storeLoginSession).toHaveBeenCalledWith({
      accessToken: fakeToken,
      refreshToken: 'refresh-token',
      userLoginId: 'john.doe',
      roles: ['ADMIN'],
      permissions: ['PRODUCT_VIEW'],
      requirePasswordChange: false,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(navigationService.clearLastUrl).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should redirect to /home if last URL is /login or null', fakeAsync(() => {
    authService.login.and.returnValue(of({
      accessToken: 'token',
      roles: [],
      permissions: [],
      requirePasswordChange: false,
    }));
    navigationService.getLastUrl.and.returnValue('/login');

    component.loginForm.setValue({ username: 'john.doe', password: 'moqui' });
    component.onSubmit();
    tick();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    expect(navigationService.clearLastUrl).toHaveBeenCalled();
  }));

  it('should redirect to change password and skip last-url handling when required', fakeAsync(() => {
    authService.login.and.returnValue(of({
      accessToken: 'token',
      requirePasswordChange: true,
    }));
    navigationService.getLastUrl.and.returnValue('/dashboard');

    component.loginForm.setValue({ username: 'john.doe', password: 'moqui' });
    component.onSubmit();
    tick();

    expect(authService.storeLoginSession).toHaveBeenCalledWith({
      accessToken: 'token',
      requirePasswordChange: true,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/change-password');
    expect(navigationService.getLastUrl).not.toHaveBeenCalled();
    expect(navigationService.clearLastUrl).not.toHaveBeenCalled();
  }));

  it('should handle login error using detail or fallback message', fakeAsync(() => {
    authService.login.and.returnValue(throwError(() => ({ error: { detail: 'Bad credentials' } })));

    component.loginForm.setValue({ username: 'john.doe', password: 'moqui' });
    component.onSubmit();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Bad credentials');
    expect(component.isLoading()).toBeFalse();
    expect(component.loginForm.get('password')?.value).toBeNull();
  }));

  it('should use fallback login error message when detail is missing', fakeAsync(() => {
    authService.login.and.returnValue(throwError(() => ({ error: { message: 'Server said no' } })));

    component.loginForm.setValue({ username: 'john.doe', password: 'moqui' });
    component.onSubmit();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Server said no');
    expect(component.isLoading()).toBeFalse();
    expect(component.loginForm.get('password')?.value).toBeNull();
  }));

  it('should use default login error message when server message is missing', fakeAsync(() => {
    authService.login.and.returnValue(throwError(() => new Error('Login failed')));

    component.loginForm.setValue({ username: 'john.doe', password: 'moqui' });
    component.onSubmit();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Invalid username or password.');
    expect(component.isLoading()).toBeFalse();
  }));
});
