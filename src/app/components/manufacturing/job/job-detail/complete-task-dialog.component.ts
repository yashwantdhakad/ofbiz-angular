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
import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';

export interface CompleteTaskDialogData {
  workEffortId: string;
  taskId: string;
  taskName?: string;
  estimatedHours?: number | null;
}

@Component({
  standalone: false,
  selector: 'app-complete-task-dialog',
  templateUrl: './complete-task-dialog.component.html',
  styleUrls: ['./complete-task-dialog.component.css'],
})
export class CompleteTaskDialogComponent {
  isSaving = false;
  readonly form = this.fb.group({
    actualHours: [this.data.estimatedHours ?? null, [Validators.min(0)]],
    actualSetupHours: [null as number | null, [Validators.min(0)]],
    hourlyRate: [null as number | null, [Validators.min(0)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly manufacturingService: ManufacturingService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
    private readonly dialogRef: MatDialogRef<CompleteTaskDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CompleteTaskDialogData
  ) {}

  get laborCostPreview(): number {
    const hours = Number(this.form.value.actualHours || 0) + Number(this.form.value.actualSetupHours || 0);
    const rate = Number(this.form.value.hourlyRate || 0);
    return hours > 0 && rate > 0 ? Math.round(hours * rate * 100) / 100 : 0;
  }

  complete(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: { actualHours?: number; actualSetupHours?: number; hourlyRate?: number } = {};
    if (this.form.value.actualHours != null) {
      payload.actualHours = Number(this.form.value.actualHours);
    }
    if (this.form.value.actualSetupHours != null) {
      payload.actualSetupHours = Number(this.form.value.actualSetupHours);
    }
    if (this.form.value.hourlyRate != null) {
      payload.hourlyRate = Number(this.form.value.hourlyRate);
    }

    this.isSaving = true;
    this.manufacturingService
      .completeJobTask(this.data.workEffortId, this.data.taskId, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.TASK_COMPLETE_SUCCESS'));
          this.dialogRef.close(true);
        },
        error: (err) => {
          const msg = err?.error?.errorMessage || err?.error?.error
            || this.translate.instant('MANUFACTURING.TASK_COMPLETE_ERROR');
          this.snackbarService.showError(msg);
        },
      });
  }
}
