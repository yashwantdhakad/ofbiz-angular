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
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { HttpResponse } from '@angular/common/http';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-featuregroups',
  templateUrl: './featuregroups.component.html',
  styleUrls: ['./featuregroups.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturegroupsComponent implements OnInit {
  isLoading = signal<boolean>(false);
  items = signal<any[]>([]);
  pages = signal<number>(0);
  private readonly destroyRef = inject(DestroyRef);

  queryString = '';
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };

  displayedColumns = [
    { key: 'productFeatureGroupId', header: 'FEATUREGROUP.ID' },
    { key: 'description', header: 'COMMON.DESCRIPTION' },
  ];

  constructor(
    private featureGroupService: FeatureGroupService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.fetchFeatureGroups(this.pagination.page, this.queryString);
  }

  fetchFeatureGroups(page: number, query: string): void {
    this.pagination.page = page;
    const pageIndex = page - 1;

    this.featureGroupService.getFeatureGroups(pageIndex, query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: HttpResponse<any[]>) => {
          this.items.set(response.body ?? []);
          const totalCount = response.headers?.get('x-total-count');
          this.pages.set(totalCount ? parseInt(totalCount, 10) : 0);
        },
        error: (_error) => {
          this.snackbarService.showError(this.translate.instant('FEATUREGROUP.FETCH_ERROR'));
        }
      });
  }

  getColumnKeys(): string[] {
    return this.displayedColumns.map(col => col.key);
  }
}
