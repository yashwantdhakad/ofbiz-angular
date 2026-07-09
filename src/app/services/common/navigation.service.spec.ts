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

import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavigationService);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store last url in localStorage', () => {
    service.setLastUrl('/home');
    expect(localStorage.getItem('lastUrl')).toBe('/home');
  });

  it('should return stored url from getLastUrl', () => {
    service.setLastUrl('/dashboard');
    expect(service.getLastUrl()).toBe('/dashboard');
  });

  it('should ignore login url when storing last url', () => {
    service.setLastUrl('/home');
    service.setLastUrl('/login');
    expect(service.getLastUrl()).toBe('/home');
    expect(localStorage.getItem('lastUrl')).toBe('/home');
  });

  it('should clear last url', () => {
    service.setLastUrl('/dashboard');
    service.clearLastUrl();
    expect(service.getLastUrl()).toBe('/');
    expect(localStorage.getItem('lastUrl')).toBeNull();
  });
});
