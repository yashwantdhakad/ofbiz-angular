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
import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'userDate',
  standalone: false,
  pure: false,
})
export class UserDatePipe implements PipeTransform {
  private lastUserLoginId: string | null = null;
  private lastTimezone: string | null = null;

  transform(
    value: string | number | Date | null | undefined,
    format: string = 'mediumDate',
    timezone?: string,
    locale?: string
  ): string | null {
    if (value == null || value === '') {
      return null;
    }
    const resolvedTimeZone = timezone || this.resolveUserTimeZone();
    const resolvedLocale = locale || this.resolveUserLocale();
    return formatDate(value, format, resolvedLocale, resolvedTimeZone);
  }

  private resolveUserTimeZone(): string {
    const userLoginId = sessionStorage.getItem('userLoginId');
    if (userLoginId !== this.lastUserLoginId) {
      this.lastUserLoginId = userLoginId;
      this.lastTimezone = null;
    }
    if (this.lastTimezone) {
      return this.lastTimezone;
    }
    const scopedKey = userLoginId ? `user_pref:${userLoginId}:timezone` : 'timezone';
    const stored = localStorage.getItem(scopedKey) || localStorage.getItem('timezone');
    this.lastTimezone = (stored && stored.trim().length > 0)
      ? stored.trim()
      : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    return this.lastTimezone;
  }

  private resolveUserLocale(): string {
    const stored = localStorage.getItem('language');
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
    return 'en-US';
  }
}
