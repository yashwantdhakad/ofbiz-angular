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
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AppComponent } from './app.component';
import { AuthService } from './services/common/auth.service';
import { RenderSchedulerService } from './services/common/render-scheduler.service';
import { UserPreferenceService } from './services/common/user-preference.service';
import { PreferredFacilityService } from './services/common/preferred-facility.service';
import { CompanyService } from './services/company/company.service';
import { FacilityService } from './services/facility/facility.service';
import { AppTitleStrategy } from './services/common/app-title.strategy';

describe('AppComponent', () => {
  let authSpy: jasmine.SpyObj<AuthService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;
  let companyServiceSpy: jasmine.SpyObj<CompanyService>;
  let facilityServiceSpy: jasmine.SpyObj<FacilityService>;
  let userPreferenceServiceSpy: jasmine.SpyObj<UserPreferenceService>;
  let preferredFacilityServiceSpy: jasmine.SpyObj<PreferredFacilityService>;

  beforeEach(() => {
    localStorage.clear();
    authSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getUserLoginId',
      'hasAnyPermission',
      'logout',
    ]);
    translateSpy = jasmine.createSpyObj('TranslateService', [
      'addLangs',
      'setDefaultLang',
      'use',
      'instant',
      'get',
      'getLangs',
    ], {
      onLangChange: of({}),
      onTranslationChange: of({}),
      onDefaultLangChange: of({}),
    });
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['defer']);
    facilityServiceSpy = jasmine.createSpyObj('FacilityService', ['getFacilities']);
    userPreferenceServiceSpy = jasmine.createSpyObj('UserPreferenceService', ['getMyPreferences', 'saveMyPreferences']);
    preferredFacilityServiceSpy = jasmine.createSpyObj('PreferredFacilityService', [
      'setPreferredFacilityId',
      'preferredFacilityId',
      'resolveInitialFacilityId',
    ]);

    const companyContext = signal({
      companyName: 'Ng ERP',
      companyLogoUrl: null,
    });
    companyServiceSpy = jasmine.createSpyObj('CompanyService', ['loadContext'], {
      context$: of({
        companyName: 'Ng ERP',
        companyLogoUrl: null,
      }),
      contextSignal: companyContext,
    });

    const titleSpy = jasmine.createSpyObj('Title', ['setTitle']);
    const appTitleStrategySpy = jasmine.createSpyObj('AppTitleStrategy', ['refresh']);

    authSpy.isAuthenticated.and.returnValue(false);
    authSpy.getUserLoginId.and.returnValue('');
    authSpy.hasAnyPermission.and.returnValue(true);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));
    translateSpy.getLangs.and.returnValue(['en', 'es', 'fr', 'hi', 'ja', 'zh', 'de']);
    renderSchedulerSpy.defer.and.callFake((task: () => void) => task());
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    facilityServiceSpy.getFacilities.and.returnValue(of([]));
    userPreferenceServiceSpy.getMyPreferences.and.returnValue(of({} as any));
    userPreferenceServiceSpy.saveMyPreferences.and.returnValue(of({} as any));
    preferredFacilityServiceSpy.preferredFacilityId.and.returnValue('');
    preferredFacilityServiceSpy.resolveInitialFacilityId.and.returnValue('');

    TestBed.configureTestingModule({
      imports: [
      ],
      declarations: [AppComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: CompanyService, useValue: companyServiceSpy },
        { provide: FacilityService, useValue: facilityServiceSpy },
        { provide: UserPreferenceService, useValue: userPreferenceServiceSpy },
        { provide: PreferredFacilityService, useValue: preferredFacilityServiceSpy },
        { provide: Title, useValue: titleSpy },
        { provide: AppTitleStrategy, useValue: appTitleStrategySpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'erp'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title()).toEqual('erp');
  });

  it('should initialize with default title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app.title()).toBe('erp');
  });

  it('should only hydrate authenticated shell data once for the same user', () => {
    authSpy.isAuthenticated.and.returnValue(true);
    authSpy.getUserLoginId.and.returnValue('demo');

    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    const loadMenuItemsSpy = spyOn<any>(component, 'loadMenuItems').and.resolveTo();

    fixture.detectChanges();

    expect(companyServiceSpy.loadContext).toHaveBeenCalledTimes(1);
    expect(facilityServiceSpy.getFacilities).toHaveBeenCalledTimes(1);
    expect(loadMenuItemsSpy).toHaveBeenCalledTimes(1);

    component.checkLoggedInStatus();

    expect(companyServiceSpy.loadContext).toHaveBeenCalledTimes(1);
    expect(facilityServiceSpy.getFacilities).toHaveBeenCalledTimes(1);
    expect(loadMenuItemsSpy).toHaveBeenCalledTimes(1);
  });

  it('hydrates authenticated shell state, loads menu/facilities, and resets on logout', () => {
    authSpy.isAuthenticated.and.returnValue(true);
    authSpy.getUserLoginId.and.returnValue('demo');
    userPreferenceServiceSpy.getMyPreferences.and.returnValue(of({
      locale: 'fr',
      theme: 'dark',
      timezone: 'Asia/Kolkata',
      facilityId: 'FAC1',
    } as any));
    facilityServiceSpy.getFacilities.and.returnValue(of([
      { facilityId: 'FAC1', facilityName: 'Main Warehouse' },
    ]));
    preferredFacilityServiceSpy.preferredFacilityId.and.returnValue('FAC1');
    preferredFacilityServiceSpy.resolveInitialFacilityId.and.returnValue('FAC1');

    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    const loadMenuItemsSpy = spyOn<any>(component, 'loadMenuItems').and.resolveTo();

    fixture.detectChanges();

    expect(userPreferenceServiceSpy.getMyPreferences).toHaveBeenCalledTimes(1);
    expect(translateSpy.use).toHaveBeenCalledWith('fr');
    expect(companyServiceSpy.loadContext).toHaveBeenCalledTimes(1);
    expect(facilityServiceSpy.getFacilities).toHaveBeenCalledTimes(1);
    expect(loadMenuItemsSpy).toHaveBeenCalledTimes(1);
    expect(preferredFacilityServiceSpy.setPreferredFacilityId).toHaveBeenCalledWith('FAC1');
    expect(component.currentLanguage()).toBe('fr');
    expect(component.isDarkMode()).toBeTrue();
    expect(component.currentTimeZone()).toBe('Asia/Kolkata');
    expect(component.getCurrentWarehouseLabel()).toBe('Main Warehouse');

    component.navBarToggleOpened.set(true);
    component.submenuOpenStateByKey.set({ menu1: true });
    component.availableFacilities.set([{ facilityId: 'FAC1' }]);
    authSpy.isAuthenticated.and.returnValue(false);
    authSpy.getUserLoginId.and.returnValue('');

    component.checkLoggedInStatus();

    expect(component.isLoggedIn()).toBeFalse();
    expect(component.navBarToggleOpened()).toBeFalse();
    expect(component.submenuOpenStateByKey()).toEqual({});
    expect(component.availableFacilities()).toEqual([]);
    expect(preferredFacilityServiceSpy.setPreferredFacilityId).toHaveBeenCalledWith('');
  });

  it('covers shell actions, preference saves, and helper branches', () => {
    authSpy.isAuthenticated.and.returnValue(true);
    authSpy.getUserLoginId.and.returnValue('demo');
    userPreferenceServiceSpy.getMyPreferences.and.returnValue(of({
      locale: 'en',
      theme: 'light',
      timezone: 'UTC',
      facilityId: 'FAC1',
    } as any));
    userPreferenceServiceSpy.saveMyPreferences.and.returnValue(of({} as any));
    preferredFacilityServiceSpy.preferredFacilityId.and.returnValue('FAC1');
    preferredFacilityServiceSpy.resolveInitialFacilityId.and.returnValue('FAC1');
    facilityServiceSpy.getFacilities.and.returnValue(of([
      { facilityId: 'FAC1', facilityName: 'Main Warehouse' },
      { facilityId: 'FAC2', label: 'Overflow' },
    ]));

    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    const _loadMenuItemsSpy = spyOn<any>(component, 'loadMenuItems').and.resolveTo();
    fixture.detectChanges();
    expect(_loadMenuItemsSpy).toHaveBeenCalledTimes(1);

    userPreferenceServiceSpy.saveMyPreferences.calls.reset();
    translateSpy.use.calls.reset();
    const themeLink = document.createElement('link');
    themeLink.id = 'themeAsset';
    document.body.appendChild(themeLink);
    spyOn(document, 'getElementById').and.returnValue(themeLink);

    component.switchLanguage('es');
    expect(component.currentLanguage()).toBe('es');
    expect(translateSpy.use).toHaveBeenCalledWith('es');
    expect(userPreferenceServiceSpy.saveMyPreferences).toHaveBeenCalledWith({ locale: 'es' });

    component.toggleTheme();
    expect(component.isDarkMode()).toBeTrue();
    expect(userPreferenceServiceSpy.saveMyPreferences).toHaveBeenCalledWith({ theme: 'dark' });
    expect(themeLink.href).toContain('dark-theme.css');
    expect(document.body.classList.contains('dark-theme')).toBeTrue();

    component.currentTimeZone.set('Asia/Kolkata');
    component.switchTimeZone('Asia/Kolkata');
    component.switchTimeZone('Asia/Tokyo');
    expect(userPreferenceServiceSpy.saveMyPreferences).toHaveBeenCalledWith({ timezone: 'Asia/Tokyo' });
    expect(component.currentTimeZone()).toBe('Asia/Tokyo');

    component.switchWarehouse(' FAC2 ');
    expect(preferredFacilityServiceSpy.setPreferredFacilityId).toHaveBeenCalledWith('FAC2');
    preferredFacilityServiceSpy.preferredFacilityId.and.returnValue('FAC2');
    expect(userPreferenceServiceSpy.saveMyPreferences).toHaveBeenCalledWith({ facilityId: 'FAC2' });
    expect(component.isSelectedWarehouse('FAC2')).toBeTrue();
    expect(component.getCurrentWarehouseLabel()).toBe('Overflow');

    component.currentUserLoginId.set('demo');
    const navigateSpy = spyOn(TestBed.inject(Router) as any, 'navigate');
    component.openMyProfile();
    component.openCompanyPage();
    expect(navigateSpy).toHaveBeenCalledWith(['/users', 'demo']);
    expect(navigateSpy).toHaveBeenCalledWith(['/company']);

    component.toggleNavBar();
    expect(component.navBarToggleOpened()).toBeTrue();
    component.toggleListGroup({ expanded: false });
    expect(component.trackByChildItem(0, { path: 'x' })).toBe('x');
    expect(component.trackByMenuItem(0, { path: 'menu' })).toBe('menu');
    expect(component.getSubmenuState({ path: 'menu' }, 0)).toBeFalse();
    component.setSubmenuState({ path: 'menu' }, 0, true);
    expect(component.getSubmenuState({ path: 'menu' }, 0)).toBeTrue();
    expect(component.getCurrentLanguageLabel()).toBe('LANGUAGE.SPANISH');
    expect(component.getCurrentTimeZoneLabel()).toBe('Tokyo');

    dialogSpy.open.and.returnValue({ afterClosed: () => of('de') } as any);
    component.openLanguageDialog();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(userPreferenceServiceSpy.saveMyPreferences).toHaveBeenCalledWith({ locale: 'de' });

    component.logout();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(component.navBarToggleOpened()).toBeFalse();
    expect(component.submenuOpenStateByKey()).toEqual({});
  });

  it('covers menu filtering, no-op helpers, and preference fallbacks', async () => {
    authSpy.isAuthenticated.and.returnValue(false);
    authSpy.getUserLoginId.and.returnValue('');
    authSpy.hasAnyPermission.and.callFake((permissions: string[]) =>
      permissions.length === 0 || permissions.includes('MENU_ORDERS_VIEW')
    );
    userPreferenceServiceSpy.getMyPreferences.and.returnValue(throwError(() => new Error('pref failed')));

    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.currentLanguage()).toBe('en');
    expect(component.getCurrentTimeZoneLabel()).toBe('Calcutta');
    expect(component.getCurrentWarehouseLabel()).toBe('COMMON.FACILITY');
    expect(component.isSelectedWarehouse('FAC1')).toBeFalse();

    spyOn(TestBed.inject(Router) as any, 'navigate');
    component.openMyProfile();
    expect((TestBed.inject(Router) as any).navigate).not.toHaveBeenCalled();

    preferredFacilityServiceSpy.preferredFacilityId.and.returnValue('');
    component.switchWarehouse('   ');
    expect(preferredFacilityServiceSpy.setPreferredFacilityId).not.toHaveBeenCalledWith('   ');

    const filtered = (component as any).filterMenuItems([
      { name: 'Denied', meta: { requiredAuth: true } },
      { name: 'Parent', children: [{ name: 'Child', path: '/customer' }] },
      { name: 'Allowed', meta: { permissions: [] }, path: '/about' },
      { name: 'Returns', path: '/returns', meta: { permissions: ['ADMIN'] } },
    ]);
    expect(filtered).toHaveSize(3);
    expect(filtered[0].name).toBe('Parent');
    expect(authSpy.hasAnyPermission).toHaveBeenCalledWith(['MENU_ORDERS_VIEW']);

    component.items.set([{ name: 'Keep', children: [{}] } as any]);
    component.submenuOpenStateByKey.set({ Keep: true, stale: true });
    (component as any).syncSubmenuStateKeys();
    expect(component.submenuOpenStateByKey()).toEqual({ Keep: true });

    await (component as any).loadMenuItems();
    expect(component.items()).toEqual([]);
  });

  it('covers authenticated preference persistence and facility fallbacks', () => {
    authSpy.isAuthenticated.and.returnValue(true);
    authSpy.getUserLoginId.and.returnValue('demo');
    userPreferenceServiceSpy.getMyPreferences.and.returnValue(of({
      locale: 'zz',
      theme: 'dark',
      facilityId: 'FAC2',
    } as any));
    userPreferenceServiceSpy.saveMyPreferences.and.returnValue(of({
      theme: 'light',
      timezone: 'UTC',
      facilityId: 'FAC3',
    } as any));
    facilityServiceSpy.getFacilities.and.returnValue(of([{ facilityId: 'FAC3', facilityName: 'Warehouse 3' }]));
    preferredFacilityServiceSpy.preferredFacilityId.and.returnValue('FAC3');
    preferredFacilityServiceSpy.resolveInitialFacilityId.and.returnValue('FAC3');

    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    spyOn<any>(component, 'loadMenuItems').and.resolveTo();

    fixture.detectChanges();

    expect(component.currentLanguage()).toBe('en');
    expect(component.isDarkMode()).toBeTrue();
    expect(component.currentTimeZone()).toBe('Asia/Calcutta');
    expect(preferredFacilityServiceSpy.setPreferredFacilityId).toHaveBeenCalledWith('FAC2');

    component.toggleTheme();
    expect(preferredFacilityServiceSpy.setPreferredFacilityId).toHaveBeenCalledWith('FAC3');
  });
});
