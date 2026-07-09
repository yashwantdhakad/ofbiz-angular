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
import { of } from 'rxjs';
import { ApiService } from '../common/api.service';
import { EmailNotificationAdminService } from './email-notification-admin.service';

describe('EmailNotificationAdminService', () => {
  let apiService: jasmine.SpyObj<ApiService>;
  let service: EmailNotificationAdminService;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', [
      'getOms',
      'postOms',
      'putOms',
      'deleteOms',
    ]);
    service = new EmailNotificationAdminService(apiService);
  });

  it('builds template collection and item mutation endpoints', () => {
    apiService.getOms.and.returnValue(of([] as any));
    apiService.postOms.and.returnValue(of({} as any));
    apiService.putOms.and.returnValue(of({} as any));
    apiService.deleteOms.and.returnValue(of(undefined as any));

    service.listTemplates().subscribe();
    service.createTemplate({ emailType: 'ORDER_CONFIRMATION', subject: 'Order' }).subscribe();
    service.updateTemplate(7, { subject: 'Updated' }).subscribe();
    service.deleteTemplate(7).subscribe();

    expect(apiService.getOms).toHaveBeenCalledWith('/common/email-template-settings');
    expect(apiService.postOms).toHaveBeenCalledWith('/common/email-template-settings', {
      emailType: 'ORDER_CONFIRMATION',
      subject: 'Order',
    });
    expect(apiService.putOms).toHaveBeenCalledWith('/common/email-template-settings/7', { subject: 'Updated' });
    expect(apiService.deleteOms).toHaveBeenCalledWith('/common/email-template-settings/7');
  });

  it('builds preview, test-send, and history endpoints', () => {
    apiService.postOms.and.returnValue(of({} as any));
    apiService.getOms.and.returnValue(of([] as any));

    service.previewTemplate(5, { orderId: 'ORD-1' }, 'en').subscribe();
    service.sendTestEmail(5, 'test@example.com', { orderId: 'ORD-1' }, 'fr').subscribe();
    service.listCommunicationHistory().subscribe();
    service.listCommunicationHistory(25).subscribe();

    expect(apiService.postOms).toHaveBeenCalledWith('/common/email-template-settings/5/preview', {
      variables: { orderId: 'ORD-1' },
      locale: 'en',
    });
    expect(apiService.postOms).toHaveBeenCalledWith('/common/email-template-settings/5/send-test', {
      toAddress: 'test@example.com',
      variables: { orderId: 'ORD-1' },
      locale: 'fr',
    });
    expect(apiService.getOms).toHaveBeenCalledWith('/common/communication-events/history?limit=200');
    expect(apiService.getOms).toHaveBeenCalledWith('/common/communication-events/history?limit=25');
  });
});
