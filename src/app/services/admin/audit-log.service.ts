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

export interface AuditLogEntry {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  changedBy?: string | null;
  changedAt: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface AuditLogFilters {
  entityType?: string | null;
  entityId?: string | null;
  action?: string | null;
  changedBy?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  page?: number;
  size?: number;
}

export interface AuditEntityConfig {
  usingDefault: boolean;
  entityTypes: string[];
  availableEntityTypes: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  constructor(private readonly apiService: ApiService) {}

  search(filters: AuditLogFilters): Observable<AuditLogEntry[]> {
    const params = new URLSearchParams();
    this.append(params, 'entityType', filters.entityType);
    this.append(params, 'entityId', filters.entityId);
    this.append(params, 'action', filters.action);
    this.append(params, 'changedBy', filters.changedBy);
    this.append(params, 'fromDate', filters.fromDate);
    this.append(params, 'toDate', filters.toDate);
    params.set('page', String(Math.max(0, filters.page ?? 0)));
    params.set('size', String(Math.min(Math.max(1, filters.size ?? 50), 200)));
    return this.apiService.getOms<AuditLogEntry[]>(`/audit-log?${params.toString()}`);
  }

  getEntityConfig(): Observable<AuditEntityConfig> {
    return this.apiService.getOms<AuditEntityConfig>('/audit-log/entity-config');
  }

  saveEntityConfig(entityTypes: string[]): Observable<AuditEntityConfig> {
    return this.apiService.putOms<AuditEntityConfig>('/audit-log/entity-config', {
      entityTypes,
    });
  }

  private append(params: URLSearchParams, key: string, value: string | null | undefined): void {
    const normalized = (value || '').trim();
    if (normalized) {
      params.set(key, normalized);
    }
  }
}
