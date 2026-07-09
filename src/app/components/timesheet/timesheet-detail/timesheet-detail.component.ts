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
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TimesheetEntry, TimesheetRecord, TimesheetService } from '@ofbiz/services/timesheet/timesheet.service';

@Component({
  selector: 'app-timesheet-detail',
  templateUrl: './timesheet-detail.component.html',
  styleUrls: ['./timesheet-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TimesheetDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly timesheet = signal<TimesheetRecord | null>(null);
  readonly columns = ['workTypeId', 'workEffortId', 'fromDate', 'hours', 'comments'];
  private id: number | null = null;

  constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private snackbarService: SnackbarService,
    private timesheetService: TimesheetService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.router.navigate(['/timesheets']);
      return;
    }
    this.id = id;
    this.load();
  }

  load(): void {
    if (this.id == null) {
      return;
    }
    this.isLoading.set(true);
    this.timesheetService.getTimesheet(this.id).subscribe({
      next: (timesheet) => {
        this.timesheet.set(timesheet);
        this.isLoading.set(false);
      },
      error: () => {
        this.timesheet.set(null);
        this.isLoading.set(false);
        this.snackbarService.showError(this.translate.instant('TIMESHEET.LOAD_ERROR'));
      },
    });
  }

  submit(): void {
    this.runWorkflow(() => this.timesheetService.submitTimesheet(this.id as number));
  }

  approve(): void {
    this.runWorkflow(() => this.timesheetService.approveTimesheet(this.id as number));
  }

  reject(): void {
    this.runWorkflow(() => this.timesheetService.rejectTimesheet(this.id as number));
  }

  deleteTimesheet(): void {
    if (this.id == null) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('TIMESHEET.DELETE_TITLE'),
        message: this.translate.instant('TIMESHEET.DELETE_MESSAGE'),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed || this.id == null) {
        return;
      }
      this.timesheetService.deleteTimesheet(this.id).subscribe({
        next: () => this.router.navigate(['/timesheets']),
        error: () => this.snackbarService.showError(this.translate.instant('TIMESHEET.DELETE_ERROR')),
      });
    });
  }

  canEdit(): boolean {
    const status = this.timesheet()?.statusId;
    return status === 'TIMESHEET_DRAFT' || status === 'TIMESHEET_REJECTED';
  }

  canSubmit(): boolean {
    return this.canEdit();
  }

  canApproveReject(): boolean {
    return this.timesheet()?.statusId === 'TIMESHEET_SUBMITTED';
  }

  statusLabel(statusId?: string): string {
    return statusId ? statusId.replace(/_/g, ' ') : '-';
  }

  workTypeLabel(value?: string): string {
    return value ? value.replace(/_/g, ' ') : '-';
  }

  workReferenceLink(entry: TimesheetEntry): string[] {
    const id = entry?.workEffortId || '';
    if ((entry?.workTypeId || '').toUpperCase() === 'PROJECT_TASK') {
      return ['/projects', id];
    }
    return ['/jobs', id];
  }

  private runWorkflow(requestFactory: () => ReturnType<TimesheetService['submitTimesheet']>): void {
    if (this.id == null) {
      return;
    }
    requestFactory().subscribe({
      next: (timesheet) => {
        this.timesheet.set(timesheet);
        this.snackbarService.showSuccess(this.translate.instant('TIMESHEET.SAVE_SUCCESS'));
      },
      error: () => this.snackbarService.showError(this.translate.instant('TIMESHEET.WORKFLOW_ERROR')),
    });
  }
}
