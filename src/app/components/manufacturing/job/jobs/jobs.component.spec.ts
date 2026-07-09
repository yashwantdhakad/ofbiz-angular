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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { JobsComponent } from './jobs.component';

describe('JobsComponent', () => {
  let component: JobsComponent;
  let fixture: ComponentFixture<JobsComponent>;
  let manufacturingServiceSpy: jasmine.SpyObj<ManufacturingService>;

  beforeEach(async () => {
    manufacturingServiceSpy = jasmine.createSpyObj('ManufacturingService', ['getJobs']);

    await TestBed.configureTestingModule({
      declarations: [JobsComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JobsComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize column keys and fetch jobs on init', () => {
    const mockResponse = {
      resultList: [{ workEffortId: 'JOB1' }],
      totalElements: 1,
    };

    manufacturingServiceSpy.getJobs.and.returnValue(of(mockResponse as any));

    fixture.detectChanges(); // triggers ngOnInit

    expect(component.displayedColumnKeys()).toEqual([
      'workEffortId',
      'workEffortName',
      'workEffortPurposeTypeDescription',
      'facilityName',
      'statusDescription',
      'estimatedStartDate',
    ]);
    expect(manufacturingServiceSpy.getJobs).toHaveBeenCalledWith(0, 10, '', '');
    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('should request page using zero-based index in getJobs', () => {
    manufacturingServiceSpy.getJobs.and.returnValue(of({ resultList: [], totalElements: 0 } as any));
    component.pagination.update((state) => ({ ...state, rowsPerPage: 25 }));
    component.queryString.set('paint');
    component.selectedPurposeType.set('WEPT_PRODUCTION_RUN');

    component.getJobs(3);

    expect(manufacturingServiceSpy.getJobs).toHaveBeenCalledWith(2, 25, 'paint', 'WEPT_PRODUCTION_RUN');
  });

  it('should handle missing responseMap gracefully', () => {
    manufacturingServiceSpy.getJobs.and.returnValue(of({}));

    component.getJobs(1);

    expect(component.items()).toEqual([]);
    expect(component.pages()).toBe(0);
    expect(component.isLoading()).toBeFalse();
  });

  it('should handle error when getJobs fails', () => {
    manufacturingServiceSpy.getJobs.and.returnValue(throwError(() => new Error('fetch failed')));

    fixture.detectChanges(); // triggers ngOnInit

    expect(manufacturingServiceSpy.getJobs).toHaveBeenCalledWith(0, 10, '', '');
    expect(component.items()).toHaveSize(0);
    expect(component.isLoading()).toBeFalse();
  });

  it('should reset page on search and request selected page on page change', () => {
    manufacturingServiceSpy.getJobs.and.returnValue(of({ resultList: [], totalElements: 0 } as any));
    component.pagination.update((state) => ({ ...state, page: 4 }));
    component.queryString.set('paint');
    component.selectedPurposeType.set('WEPT_MAINTENANCE');

    component.onSearch();
    expect(component.pagination().page).toBe(1);
    expect(manufacturingServiceSpy.getJobs).toHaveBeenCalledWith(0, 10, 'paint', 'WEPT_MAINTENANCE');

    manufacturingServiceSpy.getJobs.calls.reset();
    component.onPageChange(2);
    expect(component.pagination().page).toBe(3);
    expect(manufacturingServiceSpy.getJobs).toHaveBeenCalledWith(2, 10, 'paint', 'WEPT_MAINTENANCE');
  });
});
