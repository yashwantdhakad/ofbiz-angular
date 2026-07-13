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
import { ApiService } from '../common/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  SupportTicket,
  CreateSupportTicketRequest,
  UpdateTicketStatusRequest,
  AssignTicketRequest,
  AddCommentRequest,
  SupportTicketPageResponse
} from '@ofbiz/models/support.model';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  constructor(private apiService: ApiService) {}

  listMyTickets(page: number = 0, size: number = 20): Observable<SupportTicketPageResponse> {
    const url = `/common/support/tickets/my?page=${page}&size=${size}`;
    return this.apiService.get<{ data: SupportTicketPageResponse }>(url).pipe(
      map(res => res.data)
    );
  }

  listAllTickets(
    statusId?: string,
    typeId?: string,
    page: number = 0,
    size: number = 20
  ): Observable<SupportTicketPageResponse> {
    let url = `/common/support/tickets?page=${page}&size=${size}`;
    if (statusId) {
      url += `&statusId=${encodeURIComponent(statusId)}`;
    }
    if (typeId) {
      url += `&typeId=${encodeURIComponent(typeId)}`;
    }
    return this.apiService.get<{ data: SupportTicketPageResponse }>(url).pipe(
      map(res => res.data)
    );
  }

  getTicket(custRequestId: string): Observable<SupportTicket> {
    const url = `/common/support/tickets/${encodeURIComponent(custRequestId)}`;
    return this.apiService.get<{ data: { ticket: SupportTicket } }>(url).pipe(
      map(res => res.data.ticket)
    );
  }

  createTicket(req: CreateSupportTicketRequest): Observable<SupportTicket> {
    const url = `/common/support/tickets`;
    return this.apiService.post<{ data: { ticket: SupportTicket } }>(url, req).pipe(
      map(res => res.data.ticket)
    );
  }

  updateStatus(custRequestId: string, req: UpdateTicketStatusRequest): Observable<SupportTicket> {
    const url = `/common/support/tickets/${encodeURIComponent(custRequestId)}/status`;
    return this.apiService.patch<{ data: { ticket: SupportTicket } }>(url, req).pipe(
      map(res => res.data.ticket)
    );
  }

  assignTicket(custRequestId: string, req: AssignTicketRequest): Observable<SupportTicket> {
    const url = `/common/support/tickets/${encodeURIComponent(custRequestId)}/assign`;
    return this.apiService.patch<{ data: { ticket: SupportTicket } }>(url, req).pipe(
      map(res => res.data.ticket)
    );
  }

  addComment(custRequestId: string, req: AddCommentRequest): Observable<SupportTicket> {
    const url = `/common/support/tickets/${encodeURIComponent(custRequestId)}/comments`;
    return this.apiService.post<{ data: { ticket: SupportTicket } }>(url, req).pipe(
      map(res => res.data.ticket)
    );
  }
}
