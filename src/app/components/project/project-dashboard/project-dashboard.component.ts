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
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ProjectService, ProjectSummary } from '../../../services/project/project.service';

@Component({
  selector: 'app-project-dashboard',
  templateUrl: './project-dashboard.component.html',
  styleUrls: ['./project-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProjectDashboardComponent {
  readonly isLoading = signal(false);
  readonly projects = signal<ProjectSummary[]>([]);
  readonly projectId = signal('');
  readonly projectName = signal('');
  readonly hasSearched = signal(false);
  readonly displayedColumns = ['workEffortId', 'workEffortName', 'currentStatusId', 'percentComplete', 'totalMoneyAllowed'];
  readonly displayedProjects = computed(() => {
    const idFilter = this.projectId().trim().toLowerCase();
    const nameFilter = this.projectName().trim().toLowerCase();
    return this.projects().filter((project) => {
      const id = (project.workEffortId || '').toLowerCase();
      const name = (project.workEffortName || '').toLowerCase();
      return (!idFilter || id.includes(idFilter)) && (!nameFilter || name.includes(nameFilter));
    });
  });
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private projectService: ProjectService,
  ) {}

  createProject(): void {
    this.router.navigate(['/projects/new']);
  }

  openPlanning(): void {
    this.router.navigate(['/projects/planning']);
  }

  openProject(project: ProjectSummary): void {
    const projectId = project.workEffortId || '';
    if (!projectId) {
      return;
    }
    this.router.navigate(['/projects', projectId]);
  }

  trackProject(_: number, project: ProjectSummary): string {
    return project.workEffortId || String(project.id || '');
  }

  clearFilters(): void {
    this.projectId.set('');
    this.projectName.set('');
    this.projects.set([]);
    this.hasSearched.set(false);
  }

  searchProjects(): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);
    this.projectService.listProjects(100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.projects.set(Array.isArray(items) ? items : []);
          this.isLoading.set(false);
        },
        error: () => {
          this.projects.set([]);
          this.isLoading.set(false);
        },
      });
  }

}
