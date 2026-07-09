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
import { Component, ChangeDetectorRef, DestroyRef, inject, signal, computed, effect, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './services/common/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LanguageSelectorComponent } from './components/common/language-selector/language-selector.component';
import { PATH_PERMISSION_MAP } from './config/path-permission-map';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RenderSchedulerService } from './services/common/render-scheduler.service';
import { UserPreferenceService, UserPreferencesUpdateRequest } from './services/common/user-preference.service';
import { CompanyService } from './services/company/company.service';
import { FacilityService } from './services/facility/facility.service';
import { PreferredFacilityService } from './services/common/preferred-facility.service';
import { AppTitleStrategy } from './services/common/app-title.strategy';
import { SecurityStore } from './services/common/security.store';


type LocalPreferenceKey = 'theme' | 'locale' | 'timezone' | 'facilityId';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private hydratedShellUserLoginId: string | null = null;

  isLoggedIn = signal(false);
  navBarToggleOpened = signal(false);
  currentUserLoginId = signal('');



  companyName = computed(() => this.companyService.contextSignal()?.companyName || 'Ng ERP');
  companyLogoUrl = computed(() => this.companyService.contextSignal()?.companyLogoUrl || null);

  submenuOpenStateByKey = signal<Record<string, boolean>>({});

  title = signal('erp');
  items = signal<any[]>([]);
  currentLanguage = signal('en');
  currentTimeZone = signal('UTC');
  isDarkMode = signal(false);
  timeZones = signal<string[]>([]);
  availableFacilities = signal<any[]>([]);
  private menuItemsCache: any[] | null = null;
  languages = [
    { code: 'en', labelKey: 'LANGUAGE.ENGLISH' },
    { code: 'es', labelKey: 'LANGUAGE.SPANISH' },
    { code: 'fr', labelKey: 'LANGUAGE.FRENCH' },
    { code: 'hi', labelKey: 'LANGUAGE.HINDI' },
    { code: 'ja', labelKey: 'LANGUAGE.JAPANESE' },
    { code: 'zh', labelKey: 'LANGUAGE.CHINESE' },
    { code: 'de', labelKey: 'LANGUAGE.GERMAN' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef, // You can choose to completely inject and discard this if removed from all methods
    private dialog: MatDialog,
    private renderScheduler: RenderSchedulerService,
    private userPreferenceService: UserPreferenceService,
    private companyService: CompanyService,
    private facilityService: FacilityService,
    private preferredFacilityService: PreferredFacilityService,
    private appTitleStrategy: AppTitleStrategy,
    private securityStore: SecurityStore
  ) {
    this.translate.addLangs(this.languages.map((lang) => lang.code));
    this.translate.setDefaultLang('en');
    this.timeZones.set(this.buildTimeZoneOptions());
    this.loadUserPreferences();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.checkLoggedInStatus());



    effect(() => {
      this.companyName();
      this.appTitleStrategy.refresh(this.router.routerState.snapshot);
    });
  }

  ngOnInit(): void {
    this.checkLoggedInStatus();
  }

  checkLoggedInStatus(): void {
    this.renderScheduler.defer(() => {
      this.isLoggedIn.set(this.authService.isAuthenticated());
      const previousUserLoginId = this.currentUserLoginId();
      const nextUserLoginId = this.authService.getUserLoginId() || '';
      this.currentUserLoginId.set(nextUserLoginId);

      if (nextUserLoginId !== previousUserLoginId) {
        this.loadUserPreferences();
      }
      if (!this.isLoggedIn()) {
        this.navBarToggleOpened.set(false);
        this.submenuOpenStateByKey.set({});
        this.availableFacilities.set([]);
        this.preferredFacilityService.setPreferredFacilityId('');
        this.items.set([]);
        this.hydratedShellUserLoginId = null;
        this.securityStore.clear();
      } else {
        const shouldHydrateShell = this.hydratedShellUserLoginId !== nextUserLoginId;
        if (shouldHydrateShell) {
          this.hydratedShellUserLoginId = nextUserLoginId;
          this.companyService.loadContext();
          this.loadAvailableFacilities();
          this.securityStore.load();
          void this.loadMenuItems();
        }
      }
      this.syncSubmenuStateKeys();
      this.appTitleStrategy.refresh(this.router.routerState.snapshot);
    });
  }

  toggleNavBar() {
    this.navBarToggleOpened.update(v => !v);
  }



  toggleListGroup(item: any): void {
    item.expanded = !item.expanded;
  }

  trackByMenuItem = (index: number, item: any): string =>
    this.submenuKey(item, index);

  trackByChildItem = (index: number, childItem: any): string =>
    childItem?.path ?? childItem?.name ?? `child-${index}`;

  getSubmenuState(item: any, index: number): boolean {
    return !!this.submenuOpenStateByKey()[this.submenuKey(item, index)];
  }

  setSubmenuState(item: any, index: number, opened: boolean): void {
    this.submenuOpenStateByKey.update(state => ({
      ...state,
      [this.submenuKey(item, index)]: opened
    }));
  }

  switchLanguage(language: string) {
    this.currentLanguage.set(language);
    this.translate.use(language);
    this.saveUserPreferences({ locale: language });
    this.appTitleStrategy.refresh(this.router.routerState.snapshot);
  }

  openLanguageDialog(): void {
    const dialogRef = this.dialog.open(LanguageSelectorComponent, {
      data: {
        current: this.currentLanguage(),
        languages: this.languages,
      },
    });
    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((language) => {
        if (language) {
          this.switchLanguage(language);
        }
      });
  }

  toggleTheme(): void {
    this.isDarkMode.update(v => !v);
    this.saveUserPreferences({ theme: this.isDarkMode() ? 'dark' : 'light' });
    this.applyTheme();
  }

  switchTimeZone(timeZone: string): void {
    if (!timeZone || this.currentTimeZone() === timeZone) {
      return;
    }
    this.currentTimeZone.set(timeZone);
    this.saveUserPreferences({ timezone: timeZone });
  }

  applyTheme(): void {
    const themeLink = document.getElementById('themeAsset') as HTMLLinkElement;
    if (themeLink) {
      themeLink.href = this.isDarkMode() ? 'dark-theme.css' : 'light-theme.css';
    }
    if (this.isDarkMode()) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  getCurrentLanguageLabel(): string {
    const language = this.currentLanguage();
    const key = this.languages.find((lang) => lang.code === language)?.labelKey;
    return key ? this.translate.instant(key) : language;
  }

  getCurrentTimeZoneLabel(): string {
    const currentTimeZoneInfo = this.currentTimeZone();
    if (!currentTimeZoneInfo) {
      return 'UTC';
    }
    const segments = currentTimeZoneInfo.split('/');
    return segments.length > 1
      ? segments[segments.length - 1].replace(/_/g, ' ')
      : currentTimeZoneInfo;
  }

  getCurrentWarehouseLabel(): string {
    const preferredFacilityId = this.preferredFacilityService.preferredFacilityId();
    const facilities = this.availableFacilities();
    const selected = facilities.find((facility: any) => facility?.facilityId === preferredFacilityId);
    if (selected) {
      return selected.label || selected.facilityName || selected.facilityId;
    }
    return preferredFacilityId || this.translate.instant('COMMON.FACILITY');
  }

  switchWarehouse(facilityId: string): void {
    const nextFacilityId = (facilityId || '').trim();
    if (!nextFacilityId || this.preferredFacilityService.preferredFacilityId() === nextFacilityId) {
      return;
    }
    this.preferredFacilityService.setPreferredFacilityId(nextFacilityId);
    this.saveUserPreferences({ facilityId: nextFacilityId });
  }

  isSelectedWarehouse(facilityId?: string | null): boolean {
    return !!facilityId && this.preferredFacilityService.preferredFacilityId() === facilityId;
  }

  logout(): void {
    this.navBarToggleOpened.set(false);
    this.submenuOpenStateByKey.set({});
    this.authService.logout();
  }

  openMyProfile(): void {
    const loginId = this.currentUserLoginId();
    if (!loginId) {
      return;
    }
    this.router.navigate(['/users', loginId]);
  }

  openCompanyPage(): void {
    this.router.navigate(['/company']);
  }

  private filterMenuItems(menuItemsProp: any[]): any[] {
    return menuItemsProp
      .map((item) => this.filterMenuItem(item))
      .filter((item): item is any => !!item);
  }

  private async loadMenuItems(): Promise<void> {
    if (!this.isLoggedIn()) {
      this.items.set([]);
      this.syncSubmenuStateKeys();
      return;
    }

    if (!this.menuItemsCache) {
      const menuModule = await import('./menu');
      this.menuItemsCache = Array.isArray(menuModule.menuItems) ? menuModule.menuItems : [];
    }

    if (!this.isLoggedIn()) {
      this.items.set([]);
      this.syncSubmenuStateKeys();
      return;
    }

    this.items.set(this.filterMenuItems(this.menuItemsCache));
    this.syncSubmenuStateKeys();
  }

  private filterMenuItem(item: any): any | null {
    const erpFeature = item?.meta?.erpFeature;
    if (erpFeature && !this.securityStore.canView(erpFeature)) {
      return null;
    }

    const children = Array.isArray(item?.children)
      ? item.children
        .map((child: any) => this.filterMenuItem(child))
        .filter((child: any): child is any => !!child)
      : undefined;
    const requiredPermissions = this.resolveRequiredPermissions(item);
    const hasAccess = this.authService.hasAnyPermission(requiredPermissions);

    if (children && children.length === 0 && !item?.path) {
      return null;
    }
    if (!hasAccess) {
      return children && children.length > 0
        ? { ...item, children }
        : null;
    }
    return children ? { ...item, children } : { ...item };
  }

  private resolveRequiredPermissions(item: any): string[] {
    const configured = item?.meta?.permissions;
    if (Array.isArray(configured)) {
      const normalized = configured
        .filter((permission: unknown): permission is string => typeof permission === 'string')
        .map((permission) => permission.trim())
        .filter((permission) => permission.length > 0);
      if (normalized.length > 0 && !(normalized.length === 1 && normalized[0] === 'ADMIN')) {
        return normalized;
      }
    }
    if (typeof item?.path === 'string' && PATH_PERMISSION_MAP[item.path]) {
      return [PATH_PERMISSION_MAP[item.path]];
    }
    if (item?.meta?.requiredAuth === true) {
      return ['__DENY__'];
    }
    return [];
  }

  private submenuKey(item: any, index: number): string {
    if (typeof item?.path === 'string' && item.path.length > 0) {
      return item.path;
    }
    if (typeof item?.name === 'string' && item.name.length > 0) {
      return item.name;
    }
    return `menu-${index}`;
  }

  private syncSubmenuStateKeys(): void {
    const allowedKeys = new Set(
      this.items()
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Array.isArray(item?.children))
        .map(({ item, index }) => this.submenuKey(item, index))
    );
    this.submenuOpenStateByKey.update(state => {
      const updatedState = { ...state };
      Object.keys(updatedState).forEach((key) => {
        if (!allowedKeys.has(key)) {
          delete updatedState[key];
        }
      });
      return updatedState;
    });
  }

  private loadUserPreferences(): void {
    const userLoginId = this.authService.getUserLoginId();
    this.currentUserLoginId.set(userLoginId || '');

    const savedLang = this.getUserPreference('locale');
    if (savedLang && this.translate.getLangs().includes(savedLang)) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('en');
    }
    this.translate.use(this.currentLanguage());

    const savedTheme = this.getUserPreference('theme');
    this.isDarkMode.set(savedTheme === 'dark');

    const savedTimezone = this.getUserPreference('timezone');
    this.currentTimeZone.set(savedTimezone || this.detectBrowserTimeZone());
    this.preferredFacilityService.setPreferredFacilityId(this.getUserPreference('facilityId') || '');
    this.applyTheme();

    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.userPreferenceService.getMyPreferences()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preference) => {
          if (preference?.locale && this.translate.getLangs().includes(preference.locale)) {
            this.currentLanguage.set(preference.locale);
            this.translate.use(this.currentLanguage());
          }
          if (preference?.theme) {
            this.isDarkMode.set(preference.theme === 'dark');
          }
          const detectedBrowserTimezone = this.detectBrowserTimeZone();
          this.currentTimeZone.set(preference?.timezone || detectedBrowserTimezone);
          const resolvedFacility = preference?.facilityId || this.getUserPreference('facilityId') || this.preferredFacilityService.preferredFacilityId();
          this.preferredFacilityService.setPreferredFacilityId(resolvedFacility);
          this.applyTheme();
          this.persistLocalPreference('locale', this.currentLanguage());
          this.persistLocalPreference('theme', this.isDarkMode() ? 'dark' : 'light');
          this.persistLocalPreference('timezone', this.currentTimeZone());
          if (preference?.facilityId) {
            this.persistLocalPreference('facilityId', preference.facilityId);
          }
          if (!preference?.timezone) {
            this.saveUserPreferences({ timezone: detectedBrowserTimezone });
          }
        },
        error: () => {
          // just error handler
        }
      });
  }

  private saveUserPreferences(update: UserPreferencesUpdateRequest): void {
    if (update.locale) {
      this.persistLocalPreference('locale', update.locale);
    }
    if (update.theme) {
      this.persistLocalPreference('theme', update.theme);
    }
    if (update.timezone) {
      this.persistLocalPreference('timezone', update.timezone);
    }
    if (update.facilityId) {
      this.persistLocalPreference('facilityId', update.facilityId);
    }
    if (!this.authService.isAuthenticated()) {
      return;
    }
    this.userPreferenceService.saveMyPreferences(update)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preference) => {
          if (preference?.locale) {
            this.persistLocalPreference('locale', preference.locale);
          }
          if (preference?.theme) {
            this.persistLocalPreference('theme', preference.theme);
          }
          if (preference?.timezone) {
            this.persistLocalPreference('timezone', preference.timezone);
          }
          if (preference?.facilityId) {
            this.persistLocalPreference('facilityId', preference.facilityId);
            this.preferredFacilityService.setPreferredFacilityId(preference.facilityId);
          }
        },
        error: () => {
          // Local fallback is already stored.
        }
      });
  }

  private persistLocalPreference(key: LocalPreferenceKey, value: string): void {
    const userKey = this.userPreferenceKey(key);
    localStorage.setItem(userKey, value);
    localStorage.setItem(key, value);
  }

  private getUserPreference(key: LocalPreferenceKey): string | null {
    const userKey = this.userPreferenceKey(key);
    return localStorage.getItem(userKey) ?? localStorage.getItem(key);
  }

  private userPreferenceKey(key: LocalPreferenceKey): string {
    const userLoginId = this.authService.getUserLoginId();
    return userLoginId ? `user_pref:${userLoginId}:${key}` : key;
  }

  private loadAvailableFacilities(): void {
    this.facilityService.getFacilities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (facilities) => {
          const list = Array.isArray(facilities) ? facilities : [];
          this.availableFacilities.set(list);

          const resolvedFacilityId = this.preferredFacilityService.resolveInitialFacilityId(
            list,
            this.preferredFacilityService.preferredFacilityId()
          );
          if (!resolvedFacilityId) {
            return;
          }

          const currentFacilityId = this.preferredFacilityService.preferredFacilityId();
          if (currentFacilityId !== resolvedFacilityId) {
            this.preferredFacilityService.setPreferredFacilityId(resolvedFacilityId);
          }
        },
        error: () => {
          this.availableFacilities.set([]);
        },
      });
  }

  private detectBrowserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  private buildTimeZoneOptions(): string[] {
    const supported = (Intl as any).supportedValuesOf?.('timeZone') as string[] | undefined;
    const defaults = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Kolkata',
      'Asia/Tokyo',
      'Australia/Sydney',
    ];
    const merged = new Set([this.detectBrowserTimeZone(), ...defaults, ...(supported || [])]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }
}
