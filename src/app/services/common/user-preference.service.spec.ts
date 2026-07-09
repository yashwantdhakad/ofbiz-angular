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
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { UserPreferenceService } from './user-preference.service';

describe('UserPreferenceService', () => {
  let apiService: jasmine.SpyObj<ApiService>;
  let service: UserPreferenceService;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'put']);
    service = new UserPreferenceService(apiService);
  });

  it('loads the current user preferences from the profile endpoint', () => {
    const response = { locale: 'en', theme: 'dark', timezone: 'Asia/Kolkata', facilityId: 'FAC-1' };
    apiService.get.and.returnValue(of(response));

    let actual: unknown;
    service.getMyPreferences().subscribe((value) => {
      actual = value;
    });

    expect(apiService.get).toHaveBeenCalledWith('/common/web-user-preferences/me');
    expect(actual).toEqual(response);
  });

  it('saves the current user preferences back to the profile endpoint', () => {
    const payload = { locale: 'es', theme: 'light', timezone: 'UTC', facilityId: 'FAC-2' };
    const response = { ...payload };
    apiService.put.and.returnValue(of(response));

    let actual: unknown;
    service.saveMyPreferences(payload).subscribe((value) => {
      actual = value;
    });

    expect(apiService.put).toHaveBeenCalledWith('/common/web-user-preferences/me', { ...payload, userLocale: 'es' });
    expect(actual).toEqual(response);
  });
});
