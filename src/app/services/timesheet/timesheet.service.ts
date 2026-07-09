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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../common/api.service';

export interface TimesheetEntry {
  id?: number;
  timeEntryId?: string;
  partyId?: string;
  workerName?: string;
  workEffortId?: string;
  workTypeId?: string;
  timesheetId?: string;
  fromDate?: string;
  thruDate?: string;
  hours?: number | string;
  comments?: string;
}

export interface TimesheetRecord {
  id?: number;
  timesheetId?: string;
  partyId?: string;
  clientPartyId?: string;
  fromDate?: string;
  thruDate?: string;
  statusId?: string;
  approvedByUserLoginId?: string;
  comments?: string;
  firstWorkEffortId?: string;
  totalHours?: number | string;
  entries?: TimesheetEntry[];
}

export interface TimesheetListResponse {
  documentList?: TimesheetRecord[];
  documentListCount?: number;
}

export interface TimesheetPayload {
  partyId: string;
  clientPartyId?: string | null;
  comments?: string | null;
  entries: Array<{
    workEffortId?: string | null;
    workTypeId?: string | null;
    entryDate: string;
    hours: number | string;
    comments?: string | null;
  }>;
}

export interface TimesheetSearchParams {
  page?: number;
  size?: number;
  partyId?: string;
  statusId?: string;
  workEffortId?: string;
  fromDate?: string;
  thruDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TimesheetService {
  constructor(private apiService: ApiService) {}

  searchTimesheets(params: TimesheetSearchParams): Observable<TimesheetListResponse> {
    const search = new URLSearchParams();
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 20));
    this.append(search, 'partyId', params.partyId);
    this.append(search, 'statusId', params.statusId);
    this.append(search, 'workEffortId', params.workEffortId);
    this.append(search, 'fromDate', params.fromDate);
    this.append(search, 'thruDate', params.thruDate);
    return this.apiService.getWms<TimesheetListResponse>(`/timesheets?${search.toString()}`);
  }

  getTimesheet(id: number | string): Observable<TimesheetRecord> {
    return this.apiService.getWms<TimesheetRecord>(`/timesheets/${encodeURIComponent(String(id))}`);
  }

  createTimesheet(payload: TimesheetPayload): Observable<TimesheetRecord> {
    return this.apiService.postWms<TimesheetRecord>('/timesheets', payload);
  }

  updateTimesheet(id: number | string, payload: TimesheetPayload): Observable<TimesheetRecord> {
    return this.apiService.putWms<TimesheetRecord>(`/timesheets/${encodeURIComponent(String(id))}`, payload);
  }

  deleteTimesheet(id: number | string): Observable<unknown> {
    return this.apiService.deleteWms(`/timesheets/${encodeURIComponent(String(id))}`);
  }

  submitTimesheet(id: number | string): Observable<TimesheetRecord> {
    return this.apiService.postWms<TimesheetRecord>(`/timesheets/${encodeURIComponent(String(id))}/submit`, {});
  }

  approveTimesheet(id: number | string): Observable<TimesheetRecord> {
    return this.apiService.postWms<TimesheetRecord>(`/timesheets/${encodeURIComponent(String(id))}/approve`, {});
  }

  rejectTimesheet(id: number | string): Observable<TimesheetRecord> {
    return this.apiService.postWms<TimesheetRecord>(`/timesheets/${encodeURIComponent(String(id))}/reject`, {});
  }

  listEntriesByWorkEffort(workEffortId: string): Observable<TimesheetEntry[]> {
    return this.apiService.getWms<any>(
      `/timesheets/work-efforts/${encodeURIComponent(workEffortId)}/entries`
    ).pipe(
      map((response) => (response?.data?.entries ?? response?.entries ?? []) as TimesheetEntry[])
    );
  }

  private append(search: URLSearchParams, key: string, value?: string): void {
    const normalized = (value || '').trim();
    if (normalized) {
      search.set(key, normalized);
    }
  }
}
