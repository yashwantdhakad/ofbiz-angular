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
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { TimesheetRecord, TimesheetService } from '@ofbiz/services/timesheet/timesheet.service';

@Component({
  selector: 'app-timesheet-list',
  templateUrl: './timesheet-list.component.html',
  styleUrls: ['./timesheet-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TimesheetListComponent {
  readonly isLoading = signal(false);
  readonly hasSearched = signal(false);
  readonly timesheets = signal<TimesheetRecord[]>([]);
  readonly totalTimesheets = signal(0);
  readonly partyId = signal('');
  readonly workEffortId = signal('');
  readonly statusId = signal('');
  readonly fromDate = signal<Date | null>(null);
  readonly thruDate = signal<Date | null>(null);
  readonly displayedColumns = ['timesheetId', 'partyId', 'workEffort', 'date', 'hours', 'statusId'];
  readonly statuses = ['TIMESHEET_DRAFT', 'TIMESHEET_SUBMITTED', 'TIMESHEET_APPROVED', 'TIMESHEET_REJECTED'];
  readonly pagination = { page: 0, size: 20 };
  private readonly destroyRef = inject(DestroyRef);

  constructor(private timesheetService: TimesheetService) {}

  search(): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);
    this.timesheetService.searchTimesheets({
      page: this.pagination.page,
      size: this.pagination.size,
      partyId: this.partyId(),
      workEffortId: this.workEffortId(),
      statusId: this.statusId(),
      fromDate: this.toDateString(this.fromDate()),
      thruDate: this.toDateString(this.thruDate()),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.timesheets.set(Array.isArray(response?.documentList) ? response.documentList : []);
        this.totalTimesheets.set(Number(response?.documentListCount || 0));
        this.isLoading.set(false);
      },
      error: () => {
        this.timesheets.set([]);
        this.totalTimesheets.set(0);
        this.isLoading.set(false);
      },
    });
  }

  clear(): void {
    this.partyId.set('');
    this.workEffortId.set('');
    this.statusId.set('');
    this.fromDate.set(null);
    this.thruDate.set(null);
    this.timesheets.set([]);
    this.totalTimesheets.set(0);
    this.hasSearched.set(false);
    this.pagination.page = 0;
  }

  onPageChange(event: PageEvent): void {
    this.pagination.page = event.pageIndex;
    this.pagination.size = event.pageSize;
    this.search();
  }

  statusLabel(statusId?: string): string {
    return statusId ? statusId.replace(/_/g, ' ') : '-';
  }

  firstWorkEffort(row: TimesheetRecord): string {
    return row?.firstWorkEffortId || '-';
  }

  private toDateString(value: Date | null): string {
    if (!value) {
      return '';
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
