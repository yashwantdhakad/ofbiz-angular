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
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../common/api.service';

export type SystemServiceKey = 'wms' | 'oms' | 'gateway';

export interface SystemSummary {
  serviceName: string;
  hostname: string;
  locale: string;
  timeZone: string;
  startTime: string;
  uptimeHours: number;
  memory: {
    heapUsedBytes: number;
    heapCommittedBytes: number;
    heapMaxBytes: number;
    nonHeapUsedBytes: number;
    nonHeapCommittedBytes: number;
  };
  runtime: {
    javaVersion: string;
    osName: string;
    osArch: string;
    processors: number;
    systemLoadAverage: number;
  };
  disk: {
    path: string;
    totalBytes: number;
    freeBytes: number;
    usableBytes: number;
  };
  threads: {
    liveThreads: number;
    daemonThreads: number;
    totalStartedThreads: number;
    peakThreads: number;
  };
  environment: Array<{ label: string; value: string }>;
}

export interface LoadTestReportSummary {
  fileName: string;
  reportType: string;
  scenarioLabel: string;
  sizeBytes: number;
  modifiedAt: string;
  groupCount: number;
  totalPasses: number;
  totalFails: number;
  passRate: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  constructor(private apiService: ApiService) {}

  getSystemSummary(service: SystemServiceKey): Observable<SystemSummary> {
    switch (service) {
      case 'oms':
        return this.apiService.getOms<SystemSummary>('/admin/system/summary');
      case 'gateway':
        return this.apiService.get<SystemSummary>('/api/admin/system/summary', '/');
      case 'wms':
      default:
        return this.apiService.getWms<SystemSummary>('/admin/system/summary');
    }
  }

  getLoadTestReports(): Observable<LoadTestReportSummary[]> {
    return this.apiService.getWms<LoadTestReportSummary[]>('/admin/load-tests/reports');
  }
}
