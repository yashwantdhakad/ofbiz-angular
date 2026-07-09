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
import { catchError, finalize, of } from 'rxjs';
import { ProjectPlanningItem, ProjectPlanningResponse, ProjectService } from '@ofbiz/services/project/project.service';

type PlanningScope = 'ALL' | 'PROJECT' | 'MANUFACTURING' | 'PRODUCTION';

interface BarStyle {
  left: string;
  width: string;
}

interface ProgressStyle {
  width: string;
}

@Component({
  selector: 'app-project-planning',
  templateUrl: './project-planning.component.html',
  styleUrls: ['./project-planning.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProjectPlanningComponent {
  readonly isLoading = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly hasSearched = signal(false);
  readonly planning = signal<ProjectPlanningResponse | null>(null);
  readonly fromDate = signal<Date | null>(new Date());
  readonly thruDate = signal<Date | null>(this.addDays(new Date(), 42));
  readonly queryString = signal('');
  readonly scope = signal<PlanningScope>('ALL');
  readonly displayedItems = computed(() => this.planning()?.items || []);
  readonly summary = computed(() => this.planning()?.summary || null);
  readonly timelineRangeDays = computed(() => {
    const from = this.fromDate();
    const thru = this.thruDate();
    if (!from || !thru) {
      return 1;
    }
    const days = Math.round((this.startOfDay(thru).getTime() - this.startOfDay(from).getTime()) / 86400000) + 1;
    return Math.max(1, days);
  });
  readonly scopeOptions: Array<{ value: PlanningScope; labelKey: string; workEffortTypeIds?: string }> = [
    { value: 'ALL', labelKey: 'PROJECTS.PLANNING_SCOPE_ALL' },
    { value: 'PROJECT', labelKey: 'PROJECTS.PLANNING_SCOPE_PROJECT', workEffortTypeIds: 'PROJECT,PROJECT_PHASE,PROJECT_TASK' },
    { value: 'MANUFACTURING', labelKey: 'PROJECTS.PLANNING_SCOPE_MANUFACTURING', workEffortTypeIds: 'ROUTING,ROU_TASK' },
    { value: 'PRODUCTION', labelKey: 'PROJECTS.PLANNING_SCOPE_PRODUCTION', workEffortTypeIds: 'PROD_ORDER_HEADER,PROD_ORDER_TASK' },
  ];
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private projectService: ProjectService,
  ) {}

  createProject(): void {
    this.router.navigate(['/projects/new']);
  }

  clearFilters(): void {
    this.fromDate.set(new Date());
    this.thruDate.set(this.addDays(new Date(), 42));
    this.queryString.set('');
    this.scope.set('ALL');
    this.planning.set(null);
    this.hasSearched.set(false);
    this.errorKey.set(null);
  }

  search(): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);
    this.errorKey.set(null);

    const scope = this.scopeOptions.find((item) => item.value === this.scope());
    this.projectService.getPlanning({
      fromDate: this.formatDate(this.fromDate()),
      thruDate: this.formatDate(this.thruDate()),
      queryString: this.queryString().trim() || undefined,
      workEffortTypeIds: scope?.workEffortTypeIds,
      limit: 120,
    })
      .pipe(
        catchError(() => {
          this.errorKey.set('PROJECTS.PLANNING_LOAD_ERROR');
          return of(null);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.planning.set(response);
      });
  }

  trackItem(_: number, item: ProjectPlanningItem): string {
    return item.workEffortId || String(item.id || '');
  }

  barStyle(item: ProjectPlanningItem): BarStyle {
    const totalDays = this.timelineRangeDays();
    const start = Math.max(0, Number(item.timelineStartOffsetDays || 0));
    const duration = Math.max(1, Number(item.timelineDurationDays || 1));
    const left = Math.min(100, (start / totalDays) * 100);
    const width = Math.min(100 - left, Math.max(2, (duration / totalDays) * 100));
    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  }

  progressStyle(item: ProjectPlanningItem): ProgressStyle {
    const duration = Math.max(1, Number(item.timelineDurationDays || 1));
    const progress = Math.min(duration, Math.max(0, Number(item.timelineProgressDays || 0)));
    const width = Math.min(100, Math.max(0, (progress / duration) * 100));
    return {
      width: `${width}%`,
    };
  }

  statusClass(item: ProjectPlanningItem): string {
    if (item.late) {
      return 'late';
    }
    if (item.blockedByCount && item.blockedByCount > 0) {
      return 'blocked';
    }
    if (item.ready) {
      return 'ready';
    }
    return 'normal';
  }

  formatDate(value: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }
    return `${value.getFullYear()}-${this.pad(value.getMonth() + 1)}-${this.pad(value.getDate())}`;
  }

  labelForScope(value: PlanningScope): string {
    return this.scopeOptions.find((option) => option.value === value)?.labelKey || 'PROJECTS.PLANNING_SCOPE_ALL';
  }

  private addDays(date: Date, days: number): Date {
    const clone = new Date(date);
    clone.setDate(clone.getDate() + days);
    return clone;
  }

  private startOfDay(date: Date): Date {
    const clone = new Date(date);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private pad(value: number): string {
    return value < 10 ? `0${value}` : String(value);
  }
}
