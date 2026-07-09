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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProjectService, ProjectSummary } from '../../../services/project/project.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProjectFormComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isEditMode = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private projectId = '';
  private originalProjectId = '';

  readonly projectForm = this.fb.group({
    workEffortId: ['', Validators.required],
    workEffortName: ['', Validators.required],
    description: [''],
    workEffortTypeId: ['PROJECT', Validators.required],
    currentStatusId: ['PROJECT_ACTIVE', Validators.required],
    workEffortParentId: [''],
    percentComplete: ['0'],
    totalMoneyAllowed: ['0'],
    moneyUomId: ['USD', Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.isEditMode.set(this.route.snapshot.data?.['mode'] === 'edit');
    const id = this.route.snapshot.paramMap.get('id');
    this.projectId = id || '';
    this.originalProjectId = this.projectId;
    if (this.isEditMode() && this.projectId) {
      this.loadProject(this.projectId);
    }
  }

  save(): void {
    if (this.projectForm.invalid || this.isSaving()) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const payload = this.projectForm.value as Partial<ProjectSummary>;
    const request$ = this.isEditMode() && this.projectId
      ? this.projectService.updateProject(this.projectId, payload)
      : this.projectService.createProject(payload);

    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (saved) => {
          const nextId = saved?.workEffortId || this.projectForm.getRawValue().workEffortId || this.projectId || payload.workEffortId;
          this.snackbarService.showSuccess(
            this.translate.instant(this.isEditMode() ? 'PROJECTS.UPDATE_SUCCESS' : 'PROJECTS.CREATE_SUCCESS')
          );
          if (nextId) {
            this.router.navigate(['/projects', nextId]);
          } else {
            this.router.navigate(['/projects']);
          }
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant(this.isEditMode() ? 'PROJECTS.UPDATE_ERROR' : 'PROJECTS.CREATE_ERROR')
          );
        },
      });
  }

  cancel(): void {
    if (this.isEditMode()) {
      const targetId = this.projectId || this.originalProjectId || this.projectForm.getRawValue().workEffortId;
      if (targetId) {
        this.router.navigate(['/projects', targetId]);
        return;
      }
    }
    this.router.navigate(['/projects']);
  }

  private loadProject(id: string): void {
    this.isLoading.set(true);
    this.projectService
      .getProject(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (project) => {
          this.projectForm.patchValue({
            workEffortId: project.workEffortId || id,
            workEffortName: project.workEffortName || '',
            description: project.description || '',
            workEffortTypeId: project.workEffortTypeId || 'PROJECT',
            currentStatusId: project.currentStatusId || 'PROJECT_ACTIVE',
            workEffortParentId: '',
            percentComplete: project.percentComplete || '0',
            totalMoneyAllowed: project.totalMoneyAllowed || '0',
            moneyUomId: project.moneyUomId || 'USD',
          });
          if (project.workEffortId) {
            this.projectId = project.workEffortId;
          }
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('PROJECTS.LOAD_ERROR'));
          this.router.navigate(['/projects']);
        },
      });
  }
}
