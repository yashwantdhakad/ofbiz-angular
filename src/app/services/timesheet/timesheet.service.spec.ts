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
import { of } from 'rxjs';
import { ApiService } from '../common/api.service';
import { TimesheetService } from './timesheet.service';

describe('TimesheetService', () => {
  let service: TimesheetService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getWms', 'postWms', 'putWms', 'deleteWms']);

    TestBed.configureTestingModule({
      providers: [
        TimesheetService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(TimesheetService);
  });

  it('builds search parameters for timesheet find screen', () => {
    apiServiceSpy.getWms.and.returnValue(of({ documentList: [], documentListCount: 0 }));

    service.searchTimesheets({
      page: 1,
      size: 50,
      partyId: 'WORKER_1',
      statusId: 'TIMESHEET_SUBMITTED',
      workEffortId: 'JOB/1',
      fromDate: '2026-06-01',
      thruDate: '2026-06-30',
    }).subscribe();

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith(
      '/timesheets?page=1&size=50&partyId=WORKER_1&statusId=TIMESHEET_SUBMITTED&workEffortId=JOB%2F1&fromDate=2026-06-01&thruDate=2026-06-30'
    );
  });

  it('builds detail and workflow endpoints with encoded IDs', () => {
    apiServiceSpy.getWms.and.returnValue(of({}));
    apiServiceSpy.postWms.and.returnValue(of({}));
    apiServiceSpy.putWms.and.returnValue(of({}));
    apiServiceSpy.deleteWms.and.returnValue(of({}));

    service.getTimesheet('TS/1').subscribe();
    service.updateTimesheet('TS/1', { partyId: 'WORKER_1', entries: [] }).subscribe();
    service.submitTimesheet('TS/1').subscribe();
    service.approveTimesheet('TS/1').subscribe();
    service.rejectTimesheet('TS/1').subscribe();
    service.deleteTimesheet('TS/1').subscribe();
    service.listEntriesByWorkEffort('JOB/1').subscribe();

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/timesheets/TS%2F1');
    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/timesheets/TS%2F1', { partyId: 'WORKER_1', entries: [] });
    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/timesheets/TS%2F1/submit', {});
    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/timesheets/TS%2F1/approve', {});
    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/timesheets/TS%2F1/reject', {});
    expect(apiServiceSpy.deleteWms).toHaveBeenCalledWith('/timesheets/TS%2F1');
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/timesheets/work-efforts/JOB%2F1/entries');
  });
});
