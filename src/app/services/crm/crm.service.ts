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
import { Observable, map } from 'rxjs';
import { ApiService } from '../common/api.service';

export interface SalesOpportunity {
  id: number;
  salesOpportunityId?: string;
  opportunityName?: string;
  description?: string;
  nextStep?: string;
  estimatedAmount?: number;
  estimatedProbability?: number;
  currencyUomId?: string;
  estimatedCloseDate?: string;
  opportunityStageId?: string;
}

export interface SalesOpportunityStage {
  id?: number;
  opportunityStageId: string;
  description?: string;
  defaultProbability?: number;
  sequenceNum?: number;
}

export interface CommunicationEvent {
  id: number;
  communicationEventId?: string;
  communicationEventTypeId?: string;
  statusId?: string;
  entryDate?: string;
  datetimeStarted?: string;
  datetimeEnded?: string;
  subject?: string;
  note?: string;
  content?: string;
  fromString?: string;
  toString?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CrmService {
  constructor(private apiService: ApiService) {}

  getOpportunities(): Observable<SalesOpportunity[]> {
    return this.apiService.getWms<unknown>('/sales-opportunities?size=500').pipe(
      map((response) => this.asArray<SalesOpportunity>(response))
    );
  }

  getOpportunityList(size = 100): Observable<SalesOpportunity[]> {
    return this.apiService.getWms<unknown>(`/sales-opportunities?size=${encodeURIComponent(String(size))}`).pipe(
      map((response) => this.asArray<SalesOpportunity>(response))
    );
  }

  getOpportunity(id: number): Observable<SalesOpportunity> {
    return this.apiService.getWms<SalesOpportunity>(`/sales-opportunities/${encodeURIComponent(String(id))}`);
  }

  createOpportunity(payload: Partial<SalesOpportunity>): Observable<SalesOpportunity> {
    return this.apiService.postWms<SalesOpportunity>('/sales-opportunities', payload);
  }

  updateOpportunity(id: number, payload: Partial<SalesOpportunity>): Observable<SalesOpportunity> {
    return this.apiService.putWms<SalesOpportunity>(`/sales-opportunities/${encodeURIComponent(String(id))}`, payload);
  }

  deleteOpportunity(id: number): Observable<unknown> {
    return this.apiService.deleteWms(`/sales-opportunities/${encodeURIComponent(String(id))}`);
  }

  getStages(): Observable<SalesOpportunityStage[]> {
    return this.apiService.getWms<unknown>('/sales-opportunity-stages?size=200').pipe(
      map((response) => this.asArray<SalesOpportunityStage>(response))
    );
  }

  updateOpportunityStage(id: number, stageId: string): Observable<SalesOpportunity> {
    return this.apiService.patchWms<SalesOpportunity>(
      `/sales-opportunities/${encodeURIComponent(String(id))}/stage?stageId=${encodeURIComponent(stageId)}`,
      {}
    );
  }

  getOpportunityTimeline(opportunityId: string, limit = 100): Observable<CommunicationEvent[]> {
    const params = new URLSearchParams({
      opportunityId,
      limit: String(limit),
    });
    return this.apiService.getOms<unknown>(`/communication-events?${params.toString()}`).pipe(
      map((response) => this.asArray<CommunicationEvent>(response))
    );
  }

  private asArray<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }
    if (response && typeof response === 'object') {
      const candidate = response as { resultList?: T[]; documentList?: T[]; content?: T[] };
      return candidate.resultList || candidate.documentList || candidate.content || [];
    }
    return [];
  }
}
