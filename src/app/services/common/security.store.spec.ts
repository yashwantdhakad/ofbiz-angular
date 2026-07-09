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
import { of, throwError, Subject } from 'rxjs';
import { SecurityStore } from './security.store';
import { UserService } from '../security/user.service';
import { SecurityFeaturesResponse, ErpFeatureAccess } from '@ofbiz/models/user.model';

const NO_ACCESS: ErpFeatureAccess = { view: false, manage: false, approve: false };

describe('SecurityStore', () => {
  let store: SecurityStore;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    userServiceSpy = jasmine.createSpyObj('UserService', ['getMySecurityFeatures']);

    TestBed.configureTestingModule({
      providers: [
        SecurityStore,
        { provide: UserService, useValue: userServiceSpy },
      ],
    });

    store = TestBed.inject(SecurityStore);
  });

  it('should initialize with default loaded/loading states and open access features', () => {
    expect(store.loaded()).toBeFalse();
    expect(store.isAdmin()).toBeFalse();
    expect(store.canView('WMS')).toBeTrue();
    expect(store.canManage('ORDER')).toBeTrue();
    expect(store.canApprove('MFG')).toBeTrue();
  });

  it('should load security features on success', () => {
    const mockFeatures: SecurityFeaturesResponse = {
      groups: [],
      permissions: [],
      features: {
        WMS: { view: true, manage: false, approve: false },
        ORDER: { view: false, manage: false, approve: false },
        MFG: NO_ACCESS,
        ACCT: NO_ACCESS,
        SECURITY: NO_ACCESS,
      },
      isAdmin: false,
    };
    userServiceSpy.getMySecurityFeatures.and.returnValue(of(mockFeatures));

    store.load();

    expect(userServiceSpy.getMySecurityFeatures).toHaveBeenCalled();
    expect(store.loaded()).toBeTrue();
    expect(store.isAdmin()).toBeFalse();
    expect(store.canView('WMS')).toBeTrue();
    expect(store.canManage('WMS')).toBeFalse();
    expect(store.canView('ORDER')).toBeFalse();
  });

  it('should fall back to default open-access features on load error', () => {
    userServiceSpy.getMySecurityFeatures.and.returnValue(throwError(() => new Error('API Error')));

    store.load();

    expect(store.loaded()).toBeTrue();
    expect(store.canView('WMS')).toBeTrue();
    expect(store.canManage('WMS')).toBeTrue();
  });

  it('should return open access immediately for admin users', () => {
    const mockFeatures: SecurityFeaturesResponse = {
      groups: [],
      permissions: [],
      features: {
        WMS: NO_ACCESS,
        ORDER: NO_ACCESS,
        MFG: NO_ACCESS,
        ACCT: NO_ACCESS,
        SECURITY: NO_ACCESS,
      },
      isAdmin: true,
    };
    userServiceSpy.getMySecurityFeatures.and.returnValue(of(mockFeatures));

    store.load();

    expect(store.isAdmin()).toBeTrue();
    expect(store.canView('WMS')).toBeTrue();
    expect(store.canManage('ORDER')).toBeTrue();
    expect(store.canApprove('MFG')).toBeTrue();
  });

  it('should clear loaded security features', () => {
    const mockFeatures: SecurityFeaturesResponse = {
      groups: [],
      permissions: [],
      features: {
        WMS: { view: true, manage: false, approve: false },
        ORDER: NO_ACCESS,
        MFG: NO_ACCESS,
        ACCT: NO_ACCESS,
        SECURITY: NO_ACCESS,
      },
      isAdmin: false,
    };
    userServiceSpy.getMySecurityFeatures.and.returnValue(of(mockFeatures));

    store.load();
    expect(store.loaded()).toBeTrue();

    store.clear();
    expect(store.loaded()).toBeFalse();
  });

  it('should prevent repeated loads while currently loading', () => {
    const subject = new Subject<any>();
    userServiceSpy.getMySecurityFeatures.and.returnValue(subject);
    store.load();
    store.load();
    expect(userServiceSpy.getMySecurityFeatures).toHaveBeenCalledTimes(1);
  });

  it('should default to open access for null, undefined, or empty feature queries', () => {
    expect(store.canView(null)).toBeTrue();
    expect(store.canManage(undefined)).toBeTrue();
    expect(store.canApprove('') as any).toBeTrue();
  });
});
