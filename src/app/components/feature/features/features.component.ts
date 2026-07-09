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
import { TranslateService } from '@ngx-translate/core';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { HttpResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesComponent implements OnInit {
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
    { key: 'productFeatureId', header: 'FEATURE.ID' },
    { key: 'description', header: 'COMMON.DESCRIPTION' },
    { key: 'abbrev', header: 'FEATURE.ABBREV' },
    { key: 'productFeatureTypeId', header: 'COMMON.TYPE_ID' },
  ];

  constructor(
    private featureService: FeatureService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.fetchFeatures(this.pagination.page, this.queryString);
  }

  fetchFeatures(page: number, query: string): void {
    this.pagination.page = page;
    this.featureService.getFeatures(page - 1, query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: HttpResponse<any[]>) => {
          const body: any = response.body;
          const list = [body, body?.resultList, body?.responseMap?.resultList]
            .find((candidate: any) => Array.isArray(candidate)) ?? [];
          this.items.set(list);

          const headerCount = response.headers?.get('x-total-count') ?? response.headers?.get('X-Total-Count');
          const parsedHeaderCount = headerCount ? parseInt(headerCount, 10) : NaN;
          const fallbackCount = Number(
            body?.documentListCount ?? body?.total ?? body?.responseMap?.total ?? list.length ?? 0
          );
          this.pages.set(Number.isFinite(parsedHeaderCount) ? parsedHeaderCount : fallbackCount);
        },
        error: (_error) => {
          this.snackbarService.showError(this.translate.instant('FEATURE.FETCH_ERROR'));
        },
      });
  }

  getValue(item: any, key: string): any {
    return key.split('.').reduce((acc, part) => acc && acc[part], item);
  }

  getColumnKeys(): string[] {
    return this.displayedColumns.map(col => col.key);
  }
}
