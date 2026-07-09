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
import { UserDatePipe } from './user-date.pipe';

describe('UserDatePipe', () => {
  let pipe: UserDatePipe;

  beforeEach(() => {
    pipe = new UserDatePipe();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns null for nullish and blank values', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });

  it('uses explicit timezone and locale when provided', () => {
    const result = pipe.transform('2026-04-09T00:00:00Z', 'yyyy-MM-dd', 'UTC', 'en-US');

    expect(result).toBe('2026-04-09');
  });

  it('uses the scoped user timezone when available', () => {
    sessionStorage.setItem('userLoginId', 'demo');
    localStorage.setItem('user_pref:demo:timezone', 'Asia/Kolkata');

    const result = pipe.transform('2026-04-09T00:00:00Z', 'HH:mm', undefined, 'en-US');

    expect(result).toBe('05:30');
  });

  it('reuses cached timezone until the active user changes', () => {
    sessionStorage.setItem('userLoginId', 'demo');
    localStorage.setItem('user_pref:demo:timezone', 'UTC');

    expect(pipe.transform('2026-04-09T00:00:00Z', 'HH:mm', undefined, 'en-US'))
      .toBe('00:00');

    localStorage.setItem('user_pref:demo:timezone', 'Asia/Kolkata');

    expect(pipe.transform('2026-04-09T00:00:00Z', 'HH:mm', undefined, 'en-US'))
      .toBe('00:00');

    sessionStorage.setItem('userLoginId', 'other');
    localStorage.setItem('user_pref:other:timezone', 'Asia/Kolkata');

    expect(pipe.transform('2026-04-09T00:00:00Z', 'HH:mm', undefined, 'en-US'))
      .toBe('05:30');
  });

  it('falls back to global timezone and trimmed language preference', () => {
    localStorage.setItem('timezone', 'UTC');
    localStorage.setItem('language', ' en-US ');

    const result = pipe.transform('2026-04-09T00:00:00Z', 'MMMM');

    expect(result).toBe('April');
  });

  it('falls back to browser timezone and default locale when storage is blank', () => {
    localStorage.setItem('timezone', '   ');
    localStorage.setItem('language', '   ');
    spyOn(Intl, 'DateTimeFormat').and.returnValue({
      resolvedOptions: () => ({ timeZone: 'UTC' }),
    } as Intl.DateTimeFormat);

    const result = pipe.transform('2026-04-09T00:00:00Z', 'MMMM');

    expect(result).toBe('April');
  });
});
