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

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private readonly LAST_URL_KEY = 'lastUrl';
  private lastUrl: string;

  constructor() {
    // Initialize the lastUrl from local storage if available
    this.lastUrl = localStorage.getItem(this.LAST_URL_KEY) || '/';
  }

  /**
   * Sets the last visited URL.
   * @param url - The URL to set as the last visited.
   */
  setLastUrl(url: string): void {
    if (!this.shouldTrack(url)) {
      return;
    }
    this.lastUrl = url;
    localStorage.setItem(this.LAST_URL_KEY, url);
  }

  /**
   * Gets the last visited URL.
   * @returns The last visited URL.
   */
  getLastUrl(): string {
    return this.lastUrl;
  }

  clearLastUrl(): void {
    this.lastUrl = '/';
    localStorage.removeItem(this.LAST_URL_KEY);
  }

  private shouldTrack(url: string | null | undefined): boolean {
    if (!url) {
      return false;
    }
    const normalized = url.trim();
    if (!normalized || normalized === '/login' || normalized.startsWith('/login?')) {
      return false;
    }
    return true;
  }
}
