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
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { ProjectCostMetrics, ProjectService, ProjectSummary, WbsNode } from '../../../services/project/project.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { ProjectEditDialogComponent } from '../project-edit-dialog/project-edit-dialog.component';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProjectDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly project = signal<ProjectSummary | null>(null);
  readonly wbs = signal<WbsNode | null>(null);
  readonly metrics = signal<ProjectCostMetrics | null>(null);
  readonly projectId = signal('');
  readonly actualCost = signal<number | null>(null);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const projectId = params.get('id') || '';
      this.projectId.set(projectId);
      const cost = this.route.snapshot.queryParams?.['actualCost'];
      this.actualCost.set(cost === null || cost === undefined || cost === '' ? null : Number(cost));
      if (projectId) {
        this.loadProject(projectId);
      }
    });
  }

  editProject(): void {
    const project = this.project();
    if (!project) {
      return;
    }

    this.dialog.open(ProjectEditDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: { project },
    }).afterClosed().subscribe((updated?: ProjectSummary) => {
      if (!updated) {
        return;
      }
      this.project.set(updated);
      const projectId = updated.workEffortId || this.projectId();
      if (projectId) {
        this.loadWbs(projectId);
        this.loadMetrics(projectId);
      }
      this.snackbarService.showSuccess(this.translate.instant('PROJECTS.UPDATE_SUCCESS'));
    });
  }

  deleteProject(): void {
    const projectId = this.project()?.workEffortId || this.projectId();
    if (!projectId) {
      return;
    }

    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('PROJECTS.DELETE_TITLE'),
        message: this.translate.instant('PROJECTS.DELETE_CONFIRM'),
      },
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.projectService.deleteProject(projectId).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('PROJECTS.DELETE_SUCCESS'));
          this.router.navigate(['/projects']);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('PROJECTS.DELETE_ERROR'));
        },
      });
    });
  }

  trackNode(_: number, node: WbsNode): string {
    return node.workEffortId || String(node.id || '');
  }

  private loadProject(projectId: string): void {
    this.isLoading.set(true);
    this.errorKey.set(null);
    this.project.set(null);
    this.wbs.set(null);
    this.metrics.set(null);

    this.projectService.getProject(projectId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (project) => {
          this.project.set(project);
          this.loadWbs(projectId);
          this.loadMetrics(projectId);
        },
        error: () => {
          this.errorKey.set('PROJECTS.LOAD_ERROR');
        },
      });
  }

  private loadWbs(projectId: string): void {
    this.projectService.getWbs(projectId)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((wbs) => {
        this.wbs.set(wbs);
      });
  }

  private loadMetrics(projectId: string): void {
    this.projectService.getMetrics(projectId, this.actualCost() ?? undefined)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((metrics) => {
        this.metrics.set(metrics);
      });
  }
}
