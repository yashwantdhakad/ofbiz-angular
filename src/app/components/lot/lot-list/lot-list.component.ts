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
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { LotService } from '@ofbiz/services/lot/lot.service';
import { LotSummary } from '@ofbiz/models/lot.model';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
  standalone: false,
  selector: 'app-lot-list',
  templateUrl: './lot-list.component.html',
  styleUrls: ['./lot-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LotListComponent implements OnInit {
  isLoading = signal<boolean>(false);
  searchControl = new FormControl('');
  lots = signal<LotSummary[]>([]);
  totalLots = signal<number>(0);

  pagination = {
    page: 1,
    rowsPerPage: 20,
  };
  displayedColumns: string[] = ['lotId', 'heatNumber', 'steelGrade', 'creationDate', 'quantity', 'expirationDate'];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private lotService: LotService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private renderScheduler: RenderSchedulerService
  ) { }

  ngOnInit(): void {
    this.loadLots();
    this.searchControl.valueChanges
      .pipe(startWith(''), debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pagination.page = 1;
        this.loadLots();
      });
  }

  loadLots(): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });
    const query = (this.searchControl.value || '').toString();
    this.lotService
      .listLots(this.pagination.page - 1, query, this.pagination.rowsPerPage)
      .subscribe({
        next: (data) => {
          const list = Array.isArray(data?.resultList) ? data.resultList : [];
          const total = Number(data?.documentListCount || 0);
          this.renderScheduler.deferMacrotask(() => {
            this.lots.set(list);
            this.totalLots.set(total);
            this.isLoading.set(false);
          });
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('LOT.FETCH_LIST_ERROR'));
          this.renderScheduler.deferMacrotask(() => {
            this.lots.set([]);
            this.totalLots.set(0);
            this.isLoading.set(false);
          });
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.pagination.page = event.pageIndex + 1;
    this.pagination.rowsPerPage = event.pageSize;
    this.loadLots();
  }
}
