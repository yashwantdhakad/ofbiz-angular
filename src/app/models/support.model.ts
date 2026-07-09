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
export interface SupportTicketComment {
  id?: number;
  noteId?: string;
  noteText?: string;
  createdBy?: string;
  noteDate?: string;
}

export interface SupportTicketStatusHistory {
  statusId?: string;
  statusDatetime?: string;
}

export interface SupportTicket {
  custRequestId: string;
  custRequestTypeId: string;
  custRequestTypeName?: string;
  statusId: string;
  priority: string;
  custRequestName: string;
  description: string;
  internalComment?: string;
  reason?: string; // used for resolution note
  fromPartyId: string;
  createdByUserLogin: string;
  assignedToPartyId?: string;
  createdDate?: string;
  openDateTime?: string;
  closedDateTime?: string;
  responseRequiredDate?: string;
  comments?: SupportTicketComment[];
  statusHistory?: SupportTicketStatusHistory[];
}

export interface CreateSupportTicketRequest {
  subject: string;
  description: string;
  custRequestTypeId?: string;
  priority?: string;
}

export interface UpdateTicketStatusRequest {
  statusId: string;
  resolutionNote?: string;
}

export interface AssignTicketRequest {
  assigneeLoginId: string;
}

export interface AddCommentRequest {
  commentText: string;
}

export interface SupportTicketPageResponse {
  content: SupportTicket[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
