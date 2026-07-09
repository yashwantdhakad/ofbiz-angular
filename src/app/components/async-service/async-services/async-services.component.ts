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
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { AsyncJob, AsyncServiceService } from '@ofbiz/services/async-service/async-service.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  selector: 'app-async-services',
  standalone: false,
  templateUrl: './async-services.component.html',
  styleUrls: ['./async-services.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncServicesComponent implements OnInit {
  serviceType = '';
  status = '';

  items = signal<AsyncJob[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  cancellingId = signal<number | null>(null);

  pageIndex = 0;
  pageSize = 20;

  readonly statusOptions = ['', 'PENDING', 'PROCESSING', 'RETRY', 'FAILED', 'COMPLETED', 'SENT', 'DEAD', 'CANCELLED'];
  readonly serviceTypeOptions: string[] = ['', 'ALL', 'OUTBOUND_SYNC', 'DATA_EXCHANGE', 'REPLENISHMENT'];

  displayedColumns = ['id', 'serviceType', 'status', 'operationType', 'attemptCount', 'createdAt', 'updatedAt', 'errorMessage', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private asyncService: AsyncServiceService,
    private translate: TranslateService,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  onCancel(item: AsyncJob): void {
    if (!item || !item.cancellable || !item.serviceType || item.id == null) {
      return;
    }
    this.cancellingId.set(item.id);
    this.asyncService
      .cancelJob('WMS', item.serviceType, item.id)
      .pipe(
        finalize(() => {
          this.cancellingId.set(null);
        })
      )
      .subscribe({
        next: () => this.load(),
        error: (err) => {
          console.error('Failed to cancel async job', err);
          this.snackbar.showError(this.translate.instant('ASYNC_SERVICES.CANCEL_ERROR'));
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    this.asyncService
      .listJobs(
        'WMS',
        this.pageIndex,
        this.pageSize,
        this.serviceType || undefined,
        this.status || undefined
      )
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          this.items.set(Array.isArray(response?.items) ? response.items : []);
          this.total.set(Number(response?.total || 0));
        },
        error: (err) => {
          console.error('Failed to load async jobs', err);
          this.items.set([]);
          this.total.set(0);
          this.snackbar.showError(this.translate.instant('ASYNC_SERVICES.LOAD_ERROR'));
        },
      });
  }
}
