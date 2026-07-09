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
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TimesheetService } from '@ofbiz/services/timesheet/timesheet.service';
import { TimesheetFormComponent } from './timesheet-form.component';

describe('TimesheetFormComponent', () => {
  let component: TimesheetFormComponent;
  let fixture: ComponentFixture<TimesheetFormComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let timesheetServiceSpy: jasmine.SpyObj<TimesheetService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    timesheetServiceSpy = jasmine.createSpyObj('TimesheetService', ['getTimesheet', 'createTimesheet', 'updateTimesheet']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);
    timesheetServiceSpy.createTimesheet.and.returnValue(of({ id: 9, timesheetId: 'TS9' }));

    await TestBed.configureTestingModule({
      declarations: [TimesheetFormComponent],
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({ workEffortId: 'JOB_1', workTypeId: 'MANUFACTURING_JOB' }),
            },
          },
        },
        { provide: Router, useValue: routerSpy },
        { provide: TimesheetService, useValue: timesheetServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TimesheetFormComponent);
    component = fixture.componentInstance;
  });

  it('preloads job context from query params and creates timesheet', fakeAsync(() => {
    component.ngOnInit();
    component.form.patchValue({
      partyId: 'WORKER_1',
      entryDate: new Date(2026, 5, 28),
      hours: 7.5,
      comments: 'Shift complete',
    });

    component.save();
    tick();

    expect(timesheetServiceSpy.createTimesheet).toHaveBeenCalledWith(jasmine.objectContaining({
      partyId: 'WORKER_1',
      entries: [jasmine.objectContaining({
        workEffortId: 'JOB_1',
        workTypeId: 'MANUFACTURING_JOB',
        entryDate: '2026-06-28T00:00:00',
        hours: 7.5,
      })],
    }));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/timesheets', 9]);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('TIMESHEET.SAVE_SUCCESS');
  }));

  it('returns to find screen when cancelling create mode', () => {
    component.cancel();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/timesheets']);
  });

  it('loads timesheet and saves in edit mode', fakeAsync(() => {
    // Setup routing snapshot mock for edit mode parameter
    const route = TestBed.inject(ActivatedRoute);
    spyOn(route.snapshot.paramMap, 'get').and.returnValue('123');
    timesheetServiceSpy.getTimesheet.and.returnValue(of({
      id: 123,
      partyId: 'WORKER_2',
      clientPartyId: 'CLIENT_2',
      fromDate: '2026-07-09T08:00:00',
      totalHours: 8,
      comments: 'Daily logs',
      entries: [{
        workEffortId: 'JOB_2',
        workTypeId: 'PROJECT_TASK',
        fromDate: '2026-07-09T00:00:00',
        hours: 8,
        comments: 'Task done',
      }],
    } as any));
    timesheetServiceSpy.updateTimesheet.and.returnValue(of({ id: 123 }));

    component.ngOnInit();
    tick();

    expect(component.mode()).toBe('edit');
    expect(component.timesheetId()).toBe(123);
    expect(component.form.value.partyId).toBe('WORKER_2');

    component.save();
    tick();

    expect(timesheetServiceSpy.updateTimesheet).toHaveBeenCalledWith(123, jasmine.objectContaining({
      partyId: 'WORKER_2',
    }));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/timesheets', 123]);
  }));

  it('handles error on load failure in edit mode', fakeAsync(() => {
    const route = TestBed.inject(ActivatedRoute);
    spyOn(route.snapshot.paramMap, 'get').and.returnValue('123');
    timesheetServiceSpy.getTimesheet.and.returnValue(throwError(() => new Error('Load failed')));

    component.ngOnInit();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('TIMESHEET.LOAD_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));

  it('marks fields touched and displays error on invalid form submit', () => {
    component.form.patchValue({ partyId: '' });
    component.save();

    expect(component.form.invalid).toBeTrue();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('TIMESHEET.FILL_REQUIRED_ERROR');
  });

  it('handles error on save failure', fakeAsync(() => {
    timesheetServiceSpy.createTimesheet.and.returnValue(throwError(() => new Error('Save failed')));
    component.form.patchValue({ partyId: 'WORKER_1' });

    component.save();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('TIMESHEET.SAVE_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));

  it('converts date to/from local values correctly', () => {
    const dateStr = '2026-07-09T00:00:00';
    const parsed = (component as any).toLocalDate(dateStr);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6); // July is 6

    const emptyParsed = (component as any).toLocalDate(null);
    expect(emptyParsed).toBeInstanceOf(Date);

    const badParsed = (component as any).toLocalDate('invalid-date');
    expect(badParsed).toBeInstanceOf(Date);

    const serialized = (component as any).serializeDate(new Date(2026, 6, 9));
    expect(serialized).toBe('2026-07-09T00:00:00');

    expect((component as any).serializeDate(null)).toBe('');
  });

  it('formats work type labels correctly', () => {
    expect(component.workTypeLabel('PROJECT_TASK')).toBe('PROJECT TASK');
    expect(component.workTypeLabel()).toBe('-');
  });

  it('navigates to timesheet detail on cancel in edit mode', () => {
    component.timesheetId.set(123);
    component.cancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/timesheets', 123]);
  });
});
