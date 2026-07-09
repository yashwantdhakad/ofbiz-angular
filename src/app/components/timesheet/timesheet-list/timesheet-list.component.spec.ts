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
import { TimesheetService } from '@ofbiz/services/timesheet/timesheet.service';
import { TimesheetListComponent } from './timesheet-list.component';

describe('TimesheetListComponent', () => {
  let component: TimesheetListComponent;
  let fixture: ComponentFixture<TimesheetListComponent>;
  let timesheetServiceSpy: jasmine.SpyObj<TimesheetService>;

  beforeEach(async () => {
    timesheetServiceSpy = jasmine.createSpyObj('TimesheetService', ['searchTimesheets']);

    await TestBed.configureTestingModule({
      declarations: [TimesheetListComponent],
      providers: [{ provide: TimesheetService, useValue: timesheetServiceSpy }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TimesheetListComponent);
    component = fixture.componentInstance;
  });

  it('searches with filters and stores returned timesheets', () => {
    timesheetServiceSpy.searchTimesheets.and.returnValue(of({
      documentList: [{ id: 1, timesheetId: 'TS1', totalHours: 8 }],
      documentListCount: 1,
    }));
    component.partyId.set('WORKER_1');
    component.workEffortId.set('JOB_1');
    component.statusId.set('TIMESHEET_SUBMITTED');
    component.fromDate.set(new Date(2026, 5, 1));
    component.thruDate.set(new Date(2026, 5, 30));

    component.search();

    expect(timesheetServiceSpy.searchTimesheets).toHaveBeenCalledWith(jasmine.objectContaining({
      partyId: 'WORKER_1',
      workEffortId: 'JOB_1',
      statusId: 'TIMESHEET_SUBMITTED',
      fromDate: '2026-06-01',
      thruDate: '2026-06-30',
    }));
    expect(component.timesheets()).toHaveSize(1);
    expect(component.totalTimesheets()).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('clears state and handles search errors', () => {
    timesheetServiceSpy.searchTimesheets.and.returnValue(throwError(() => new Error('failed')));

    component.search();

    expect(component.timesheets()).toEqual([]);
    expect(component.totalTimesheets()).toBe(0);
    expect(component.isLoading()).toBeFalse();

    component.partyId.set('WORKER_1');
    component.hasSearched.set(true);
    component.clear();

    expect(component.partyId()).toBe('');
    expect(component.hasSearched()).toBeFalse();
  });
});
