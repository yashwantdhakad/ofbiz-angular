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
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {
  AdminDashboardService,
  SystemServiceKey,
  SystemSummary,
} from '@ofbiz/services/admin/admin-dashboard.service';

@Component({
  selector: 'app-system-dashboard',
  standalone: false,
  templateUrl: './system-dashboard.component.html',
  styleUrls: ['./system-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemDashboardComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly summary = signal<SystemSummary | null>(null);
  readonly selectedService = signal<SystemServiceKey>('oms');
  readonly serviceOptions: Array<{ value: SystemServiceKey; labelKey: string }> = [
    { value: 'oms', labelKey: 'SYSTEM.SERVICE_OMS' },
    { value: 'gateway', labelKey: 'SYSTEM.SERVICE_GATEWAY' },
  ];

  constructor(private adminDashboardService: AdminDashboardService) {}

  ngOnInit(): void {
    this.refresh();
  }

  onServiceChange(service: SystemServiceKey): void {
    this.selectedService.set(service);
    this.refresh();
  }

  refresh(): void {
    this.isLoading.set(true);
    this.adminDashboardService.getSystemSummary(this.selectedService()).subscribe({
      next: (response) => {
        this.summary.set(response);
        this.isLoading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.isLoading.set(false);
      },
    });
  }

  bytesToMiB(value: number | null | undefined): string {
    const bytes = Number(value || 0);
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  }

  bytesToGiB(value: number | null | undefined): string {
    const bytes = Number(value || 0);
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  }
}
