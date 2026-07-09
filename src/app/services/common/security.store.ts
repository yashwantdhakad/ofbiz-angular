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
import { Injectable, computed, signal } from '@angular/core';
import { UserService } from '../security/user.service';
import { ErpFeature, ErpFeatureAccess, SecurityFeaturesResponse } from '@ofbiz/models/user.model';

const OPEN_ACCESS: ErpFeatureAccess = { view: true, manage: true, approve: true };
const NO_ACCESS: ErpFeatureAccess = { view: false, manage: false, approve: false };

const EMPTY_FEATURES: SecurityFeaturesResponse = {
  groups: [],
  permissions: [],
  features: {
    WMS: OPEN_ACCESS,
    ORDER: OPEN_ACCESS,
    MFG: OPEN_ACCESS,
    ACCT: OPEN_ACCESS,
    SECURITY: OPEN_ACCESS,
  },
  isAdmin: false,
};

type ErpFeatureInput = ErpFeature | string | null | undefined;

@Injectable({ providedIn: 'root' })
export class SecurityStore {
  private readonly _state = signal<SecurityFeaturesResponse>(EMPTY_FEATURES);
  private readonly _loaded = signal(false);
  private readonly _loading = signal(false);

  readonly isAdmin = computed(() => this._state().isAdmin);
  readonly loaded = computed(() => this._loaded());

  constructor(private readonly userService: UserService) {}

  load(): void {
    if (this._loading()) return;
    this._loading.set(true);
    this.userService.getMySecurityFeatures().subscribe({
      next: (features) => {
        this._state.set(features ?? EMPTY_FEATURES);
        this._loaded.set(true);
        this._loading.set(false);
      },
      error: () => {
        // On error (e.g. 404 when backend is old), stay in open-access mode
        this._state.set(EMPTY_FEATURES);
        this._loaded.set(true);
        this._loading.set(false);
      },
    });
  }

  clear(): void {
    this._state.set(EMPTY_FEATURES);
    this._loaded.set(false);
    this._loading.set(false);
  }

  canView(feature: ErpFeatureInput): boolean {
    if (!feature || !this._loaded()) return true;
    return this.resolveFeatureAccess(this._state(), feature as ErpFeature)?.view ?? true;
  }

  canManage(feature: ErpFeatureInput): boolean {
    if (!feature || !this._loaded()) return true;
    return this.resolveFeatureAccess(this._state(), feature as ErpFeature)?.manage ?? false;
  }

  canApprove(feature: ErpFeatureInput): boolean {
    if (!feature || !this._loaded()) return true;
    return this.resolveFeatureAccess(this._state(), feature as ErpFeature)?.approve ?? false;
  }

  private resolveFeatureAccess(state: SecurityFeaturesResponse, feature: ErpFeature): ErpFeatureAccess {
    if (state.isAdmin) return OPEN_ACCESS;
    return state.features?.[feature] ?? NO_ACCESS;
  }
}
