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

export interface WbsNode {
  id?: number;
  workEffortId?: string;
  name?: string;
  type?: string;
  statusId?: string;
  percentComplete?: string;
  totalMoneyAllowed?: string;
  moneyUomId?: string;
  children?: WbsNode[];
}

export interface ProjectCostMetrics {
  workEffortId: string;
  budgetAtCompletion: number;
  actualCost: number;
  earnedValue: number;
  estimateAtCompletion: number;
  percentComplete: number;
  currencyUomId?: string;
}

export interface ProjectPlanningItem {
  id?: number;
  workEffortId?: string;
  workEffortName?: string;
  workEffortTypeId?: string;
  currentStatusId?: string;
  workEffortParentId?: string;
  parentWorkEffortName?: string;
  priority?: string;
  facilityId?: string;
  estimatedStartDate?: string;
  estimatedCompletionDate?: string;
  actualStartDate?: string;
  actualCompletionDate?: string;
  percentComplete?: string;
  dependencyCount?: number;
  blockedByCount?: number;
  successorCount?: number;
  late?: boolean;
  ready?: boolean;
  timelineStartOffsetDays?: number;
  timelineDurationDays?: number;
  timelineProgressDays?: number;
}

export interface ProjectPlanningSummary {
  totalItems?: number;
  lateItems?: number;
  blockedItems?: number;
  readyItems?: number;
  averagePercentComplete?: number;
}

export interface ProjectPlanningResponse {
  fromDate?: string;
  thruDate?: string;
  summary?: ProjectPlanningSummary;
  items?: ProjectPlanningItem[];
}

export interface ProjectSummary {
  id?: number;
  workEffortId?: string;
  workEffortName?: string;
  description?: string;
  workEffortParentId?: string;
  currentStatusId?: string;
  workEffortTypeId?: string;
  percentComplete?: string;
  totalMoneyAllowed?: string;
  moneyUomId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  constructor(private apiService: ApiService) {}

  listProjects(size = 100): Observable<ProjectSummary[]> {
    return this.apiService.getWms<ProjectSummary[]>(`/work-efforts?workEffortTypeIds=PROJECT&size=${encodeURIComponent(String(size))}`);
  }

  getProject(id: string): Observable<ProjectSummary> {
    return this.apiService.getWms<ProjectSummary>(`/work-efforts/${encodeURIComponent(id)}`);
  }

  createProject(payload: Partial<ProjectSummary>): Observable<ProjectSummary> {
    return this.apiService.postWms<ProjectSummary>('/work-efforts', payload);
  }

  updateProject(id: string, payload: Partial<ProjectSummary>): Observable<ProjectSummary> {
    return this.apiService.putWms<ProjectSummary>(`/work-efforts/${encodeURIComponent(id)}`, payload);
  }

  deleteProject(id: string): Observable<unknown> {
    return this.apiService.deleteWms(`/work-efforts/${encodeURIComponent(id)}`);
  }

  getWbs(projectId: string): Observable<WbsNode> {
    return this.apiService.getWms<WbsNode>(`/projects/${encodeURIComponent(projectId)}/wbs`);
  }

  getMetrics(projectId: string, actualCost?: number): Observable<ProjectCostMetrics> {
    const query = actualCost === undefined || Number.isNaN(actualCost) ? '' : `?actualCost=${encodeURIComponent(String(actualCost))}`;
    return this.apiService.getWms<ProjectCostMetrics>(`/projects/${encodeURIComponent(projectId)}/metrics${query}`);
  }

  getPlanning(params: {
    fromDate?: string;
    thruDate?: string;
    queryString?: string;
    workEffortTypeIds?: string;
    statusId?: string;
    facilityId?: string;
    limit?: number;
  } = {}): Observable<ProjectPlanningResponse> {
    const search = new URLSearchParams();
    if (params.fromDate) {
      search.append('fromDate', params.fromDate);
    }
    if (params.thruDate) {
      search.append('thruDate', params.thruDate);
    }
    if (params.queryString) {
      search.append('queryString', params.queryString);
    }
    if (params.workEffortTypeIds) {
      search.append('workEffortTypeIds', params.workEffortTypeIds);
    }
    if (params.statusId) {
      search.append('statusId', params.statusId);
    }
    if (params.facilityId) {
      search.append('facilityId', params.facilityId);
    }
    if (params.limit !== undefined) {
      search.append('limit', String(params.limit));
    }
    const query = search.toString();
    const suffix = query ? `?${query}` : '';
    return this.apiService.getWms<ProjectPlanningResponse>(`/projects/planning${suffix}`);
  }
}
