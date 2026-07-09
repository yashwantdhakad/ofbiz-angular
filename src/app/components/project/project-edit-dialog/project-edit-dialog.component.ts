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
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { ProjectService, ProjectSummary } from '../../../services/project/project.service';

@Component({
  selector: 'app-project-edit-dialog',
  templateUrl: './project-edit-dialog.component.html',
  styleUrls: ['./project-edit-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProjectEditDialogComponent {
  readonly isSaving = signal(false);

  readonly form = this.fb.group({
    workEffortName: [this.data.project.workEffortName || '', Validators.required],
    currentStatusId: [this.data.project.currentStatusId || 'PROJECT_ACTIVE', Validators.required],
    percentComplete: [this.data.project.percentComplete || '0'],
    totalMoneyAllowed: [this.data.project.totalMoneyAllowed || '0'],
    moneyUomId: [this.data.project.moneyUomId || 'USD', Validators.required],
    description: [this.data.project.description || ''],
  });

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private dialogRef: MatDialogRef<ProjectEditDialogComponent, ProjectSummary | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: { project: ProjectSummary },
  ) {}

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.data.project.workEffortId || String(this.data.project.id || '');
    if (!id) {
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    const payload: Partial<ProjectSummary> = {
      ...this.data.project,
      workEffortName: raw.workEffortName || '',
      currentStatusId: raw.currentStatusId || '',
      percentComplete: raw.percentComplete || '0',
      totalMoneyAllowed: raw.totalMoneyAllowed || '0',
      moneyUomId: raw.moneyUomId || 'USD',
      description: raw.description || '',
    };
    this.projectService.updateProject(id, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (saved) => this.dialogRef.close(saved),
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
