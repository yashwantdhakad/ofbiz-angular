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
import { JobNoteRecord } from '@ofbiz/models/manufacturing.model';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';

export interface JobNoteDialogData {
  noteData: JobNoteRecord & { workEffortId: string };
}

@Component({
  standalone: false,
  selector: 'app-job-note-dialog',
  templateUrl: './job-note-dialog.component.html',
  styleUrls: ['./job-note-dialog.component.css'],
})
export class JobNoteDialogComponent {
  isSaving = false;
  readonly noteForm = this.fb.group({
    noteText: [this.data.noteData.noteText || this.data.noteData.internalNote || '', [Validators.required]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly manufacturingService: ManufacturingService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
    private readonly dialogRef: MatDialogRef<JobNoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JobNoteDialogData
  ) {}

  save(): void {
    if (this.noteForm.invalid || this.isSaving) {
      this.noteForm.markAllAsTouched();
      return;
    }
    const noteText = String(this.noteForm.value.noteText || '').trim();
    const noteId = this.data.noteData.id;
    const request$ = noteId
      ? this.manufacturingService.updateJobNote(this.data.noteData.workEffortId, noteId, { noteText })
      : this.manufacturingService.createJobNote(this.data.noteData.workEffortId, { noteText });

    this.isSaving = true;
    request$
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (result) => {
          this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.JOB_NOTE_SAVE_SUCCESS'));
          this.dialogRef.close(result);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('MANUFACTURING.JOB_NOTE_SAVE_ERROR'));
        },
      });
  }
}
