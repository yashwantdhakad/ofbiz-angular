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
import { map } from 'rxjs/operators';
import { ApiService } from '../common/api.service';

export interface EmailTemplateSetting {
  id?: number;
  emailTemplateSettingId?: string;
  emailType?: string;
  description?: string;
  bodyScreenLocation?: string;
  xslfoAttachScreenLocation?: string;
  fromAddress?: string;
  ccAddress?: string;
  bccAddress?: string;
  subject?: string;
  contentType?: string;
  templateBody?: string;
  templateVariables?: string;
  active?: boolean;
}

export interface EmailTemplatePreviewResponse {
  subject: string;
  body: string;
  contentType: string;
  resolvedLocale: string;
  subjectSource: string;
  bodySource: string;
}

export interface EmailTemplateTestSendResponse {
  communicationEventId: string;
  statusId: string;
}

export interface CommunicationEventSummary {
  id: number;
  communicationEventId: string;
  emailType: string;
  statusId: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  referenceType: string;
  referenceId: string;
  entryDate: string;
  datetimeEnded: string;
  messageId: string;
  note: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailNotificationAdminService {
  constructor(private apiService: ApiService) {}

  listTemplates(): Observable<EmailTemplateSetting[]> {
    return this.apiService.getOms<any>('/common/email-template-settings').pipe(
      map((res: any) => {
        const body = res?.data ?? res;
        if (Array.isArray(body?.templates)) {
          return body.templates;
        }
        return Array.isArray(body) ? body : [];
      })
    );
  }

  createTemplate(payload: EmailTemplateSetting): Observable<EmailTemplateSetting> {
    return this.apiService.postOms<any>('/common/email-template-settings', payload).pipe(
      map((res: any) => (res?.data?.template ?? res?.data ?? res) as EmailTemplateSetting)
    );
  }

  updateTemplate(id: number, payload: EmailTemplateSetting): Observable<EmailTemplateSetting> {
    return this.apiService.putOms<any>(`/common/email-template-settings/${id}`, payload).pipe(
      map((res: any) => (res?.data?.template ?? res?.data ?? res) as EmailTemplateSetting)
    );
  }

  deleteTemplate(id: number): Observable<void> {
    return this.apiService.deleteOms<any>(`/common/email-template-settings/${id}`).pipe(
      map(() => void 0)
    );
  }

  previewTemplate(id: number, variables: Record<string, unknown>, locale?: string): Observable<EmailTemplatePreviewResponse> {
    return this.apiService.postOms<any>(
      `/common/email-template-settings/${id}/preview`,
      { variables, locale }
    ).pipe(
      map((res: any) => (res?.data ?? res) as EmailTemplatePreviewResponse)
    );
  }

  sendTestEmail(
    id: number,
    toAddress: string,
    variables: Record<string, unknown>,
    locale?: string
  ): Observable<EmailTemplateTestSendResponse> {
    return this.apiService.postOms<any>(
      `/common/email-template-settings/${id}/send-test`,
      { toAddress, variables, locale }
    ).pipe(
      map((res: any) => (res?.data ?? res) as EmailTemplateTestSendResponse)
    );
  }

  listCommunicationHistory(limit = 200): Observable<CommunicationEventSummary[]> {
    return this.apiService.getOms<any>(`/common/communication-events/history?limit=${limit}`).pipe(
      map((res: any) => {
        const body = res?.data ?? res;
        if (Array.isArray(body?.events)) {
          return body.events;
        }
        return Array.isArray(body) ? body : [];
      })
    );
  }
}
