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
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface UserPreferences {
  locale?: string | null;
  theme?: string | null;
  timezone?: string | null;
  facilityId?: string | null;
}

export interface UserPreferencesUpdateRequest {
  locale?: string;
  theme?: string;
  timezone?: string;
  facilityId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserPreferenceService {
  constructor(private apiService: ApiService) {}

  getMyPreferences(): Observable<UserPreferences> {
    return this.apiService.get<any>('/common/web-user-preferences/me').pipe(
      map((res) => {
        const body = res?.data ?? res;
        return {
          locale: body?.userLocale || body?.locale,
          theme: body?.theme,
          timezone: body?.timezone,
          facilityId: body?.facilityId
        } as UserPreferences;
      })
    );
  }

  saveMyPreferences(payload: UserPreferencesUpdateRequest): Observable<UserPreferences> {
    const updatedPayload = { ...payload, userLocale: payload.locale };
    return this.apiService.put<any>('/common/web-user-preferences/me', updatedPayload).pipe(
      map((res) => {
        const body = res?.data ?? res;
        return {
          locale: body?.userLocale || body?.locale,
          theme: body?.theme,
          timezone: body?.timezone,
          facilityId: body?.facilityId
        } as UserPreferences;
      })
    );
  }
}
