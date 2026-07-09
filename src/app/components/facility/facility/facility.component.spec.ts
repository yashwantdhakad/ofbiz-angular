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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FacilityComponent } from './facility.component';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { CommonService } from '@ofbiz/services/common/common.service';

describe('FacilityComponent', () => {
  let component: FacilityComponent;
  let fixture: ComponentFixture<FacilityComponent>;
  let facilityService: jasmine.SpyObj<FacilityService>;

  beforeEach(async () => {
    const facilitySpy = jasmine.createSpyObj('FacilityService', ['getFacilities', 'getFacilityTypes']);
    const commonSpy = jasmine.createSpyObj('CommonService', ['noop']);

    await TestBed.configureTestingModule({
      declarations: [FacilityComponent],
      providers: [
        { provide: FacilityService, useValue: facilitySpy },
        { provide: CommonService, useValue: commonSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    facilityService = TestBed.inject(FacilityService) as jasmine.SpyObj<FacilityService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    facilityService.getFacilities.and.returnValue(of([]));
    facilityService.getFacilityTypes.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load facilities on init', fakeAsync(() => {
    const mockFacilities = [{ facilityId: 'F1' }];
    const mockTypes = [{ facilityTypeId: 'WAREHOUSE', description: 'Warehouse' }];
    facilityService.getFacilities.and.returnValue(of(mockFacilities));
    facilityService.getFacilityTypes.and.returnValue(of(mockTypes));
    fixture.detectChanges();
    tick();
    expect(facilityService.getFacilities).toHaveBeenCalled();
    expect(facilityService.getFacilityTypes).toHaveBeenCalled();
    expect(component.items()).toEqual(mockFacilities);
    expect(component.getFacilityTypeDescription('WAREHOUSE')).toBe('Warehouse');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle loadFacilities error', fakeAsync(() => {
    facilityService.getFacilities.and.returnValue(throwError(() => new Error('Err')));
    facilityService.getFacilityTypes.and.returnValue(of([]));
    fixture.detectChanges();
    tick();
    expect(component.items()).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  }));
});
