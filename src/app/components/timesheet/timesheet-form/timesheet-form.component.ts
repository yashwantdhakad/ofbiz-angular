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
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TimesheetPayload, TimesheetRecord, TimesheetService } from '@ofbiz/services/timesheet/timesheet.service';

@Component({
  selector: 'app-timesheet-form',
  templateUrl: './timesheet-form.component.html',
  styleUrls: ['./timesheet-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TimesheetFormComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly mode = signal<'create' | 'edit'>('create');
  readonly timesheetId = signal<number | null>(null);
  readonly workTypes = ['MANUFACTURING_JOB', 'PROJECT_TASK', 'MAINTENANCE', 'GENERAL'];

  readonly form = this.fb.group({
    partyId: ['', Validators.required],
    clientPartyId: [''],
    workTypeId: ['GENERAL', Validators.required],
    workEffortId: [''],
    entryDate: [new Date(), Validators.required],
    hours: [8, [Validators.required, Validators.min(0.01)]],
    comments: [''],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackbarService: SnackbarService,
    private timesheetService: TimesheetService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.timesheetId.set(Number(id));
      this.loadTimesheet(Number(id));
      return;
    }
    const query = this.route.snapshot.queryParamMap;
    this.form.patchValue({
      workEffortId: query.get('workEffortId') || '',
      workTypeId: query.get('workTypeId') || query.get('workType') || 'GENERAL',
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbarService.showError(this.translate.instant('TIMESHEET.FILL_REQUIRED_ERROR'));
      return;
    }
    const payload = this.toPayload();
    this.isLoading.set(true);
    const request = this.mode() === 'edit' && this.timesheetId() != null
      ? this.timesheetService.updateTimesheet(this.timesheetId() as number, payload)
      : this.timesheetService.createTimesheet(payload);
    request.subscribe({
      next: (timesheet) => {
        this.isLoading.set(false);
        this.snackbarService.showSuccess(this.translate.instant('TIMESHEET.SAVE_SUCCESS'));
        this.router.navigate(['/timesheets', timesheet?.id || this.timesheetId()]);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.showError(this.translate.instant('TIMESHEET.SAVE_ERROR'));
      },
    });
  }

  cancel(): void {
    const id = this.timesheetId();
    this.router.navigate(id ? ['/timesheets', id] : ['/timesheets']);
  }

  workTypeLabel(value?: string): string {
    return value ? value.replace(/_/g, ' ') : '-';
  }

  private loadTimesheet(id: number): void {
    this.isLoading.set(true);
    this.timesheetService.getTimesheet(id).subscribe({
      next: (timesheet) => {
        this.patchForm(timesheet);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.showError(this.translate.instant('TIMESHEET.LOAD_ERROR'));
      },
    });
  }

  private patchForm(timesheet: TimesheetRecord): void {
    const entry = Array.isArray(timesheet?.entries) && timesheet.entries.length ? timesheet.entries[0] : null;
    this.form.patchValue({
      partyId: timesheet?.partyId || '',
      clientPartyId: timesheet?.clientPartyId || '',
      workTypeId: entry?.workTypeId || 'GENERAL',
      workEffortId: entry?.workEffortId || '',
      entryDate: this.toLocalDate(entry?.fromDate || timesheet?.fromDate),
      hours: Number(entry?.hours || timesheet?.totalHours || 0),
      comments: entry?.comments || timesheet?.comments || '',
    });
  }

  private toPayload(): TimesheetPayload {
    const raw = this.form.getRawValue();
    return {
      partyId: raw.partyId || '',
      clientPartyId: raw.clientPartyId || null,
      comments: raw.comments || null,
      entries: [
        {
          workEffortId: raw.workEffortId || null,
          workTypeId: raw.workTypeId || 'GENERAL',
          entryDate: this.serializeDate(raw.entryDate),
          hours: raw.hours || 0,
          comments: raw.comments || null,
        },
      ],
    };
  }

  private serializeDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : this.toLocalDate(String(value));
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }

  private toLocalDate(value?: string): Date {
    if (!value) {
      return new Date();
    }
    const [year, month, day] = value.substring(0, 10).split('-').map((part) => Number(part));
    if (!year || !month || !day) {
      return new Date();
    }
    return new Date(year, month - 1, day);
  }
}
