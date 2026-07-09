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
import { FormBuilder } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import {
  CommunicationEventSummary,
  EmailNotificationAdminService,
  EmailTemplatePreviewResponse,
  EmailTemplateSetting,
} from '@ofbiz/services/admin/email-notification-admin.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { EmailNotificationAdminComponent } from './email-notification-admin.component';

describe('EmailNotificationAdminComponent', () => {
  let component: EmailNotificationAdminComponent;
  let service: jasmine.SpyObj<EmailNotificationAdminService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;
  let translate: jasmine.SpyObj<TranslateService>;
  let sanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(() => {
    service = jasmine.createSpyObj<EmailNotificationAdminService>('EmailNotificationAdminService', [
      'listTemplates',
      'listCommunicationHistory',
      'previewTemplate',
      'sendTestEmail',
      'updateTemplate',
      'createTemplate',
      'deleteTemplate',
    ]);
    snackbar = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant', 'getDefaultLang'], {
      currentLang: 'en',
    });
    translate.instant.and.callFake((key: string) => key);
    translate.getDefaultLang.and.returnValue('en');
    sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', [
      'sanitize',
      'bypassSecurityTrustHtml',
    ]);
    sanitizer.sanitize.and.callFake((_context, value) => String(value || ''));
    sanitizer.bypassSecurityTrustHtml.and.callFake((value) => value as any);
    service.listTemplates.and.returnValue(of([]));
    service.listCommunicationHistory.and.returnValue(of([]));

    component = new EmailNotificationAdminComponent(
      new FormBuilder(),
      service,
      snackbar,
      translate,
      sanitizer
    );
  });

  it('loads templates and history on init', () => {
    const templates: EmailTemplateSetting[] = [
      { id: 10, emailType: 'SALES_ORDER_APPROVED', description: 'Sales order approved', active: true },
    ];
    const history: CommunicationEventSummary[] = [
      { entryDate: '2024-01-01', emailType: 'SALES_ORDER_APPROVED', statusId: 'SENT', reference: 'PO-1', toAddress: 'qa@test.local', subject: 'Subject' } as any,
    ];
    service.listTemplates.and.returnValue(of(templates));
    service.listCommunicationHistory.and.returnValue(of(history));

    component.ngOnInit();

    expect(component.templates()).toEqual(templates);
    expect(component.history()).toEqual(history);
    expect(component.selectedTemplateId()).toBe(10);
    expect(component.templateForm.getRawValue().emailType).toBe('SALES_ORDER_APPROVED');
    expect(component.isTemplatesLoading()).toBeFalse();
    expect(component.isHistoryLoading()).toBeFalse();
  });

  it('falls back to create new when no template is selected or templates load empty', () => {
    service.listTemplates.and.returnValue(of([]));
    service.listCommunicationHistory.and.returnValue(of([]));

    component.loadTemplates();

    expect(component.templates()).toEqual([]);
    expect(component.selectedTemplateId()).toBeNull();
    expect(component.preview()).toBeNull();
    expect(component.templateForm.getRawValue().active).toBeTrue();
  });

  it('handles template and history load errors', () => {
    service.listTemplates.and.returnValue(throwError(() => new Error('template failed')));
    service.listCommunicationHistory.and.returnValue(throwError(() => new Error('history failed')));

    component.loadTemplates();
    component.loadHistory();

    expect(component.templates()).toEqual([]);
    expect(component.history()).toEqual([]);
    expect(component.isTemplatesLoading()).toBeFalse();
    expect(component.isHistoryLoading()).toBeFalse();
  });

  it('resets to a new template and maps selected template fields', () => {
    component.createNew();
    expect(component.selectedTemplateId()).toBeNull();
    expect(component.preview()).toBeNull();
    expect(component.templateForm.getRawValue().contentType).toBe('text/html');

    component.selectTemplate({
      id: 5,
      emailTemplateSettingId: 'T-5',
      emailType: 'ORDER_CREATED',
      description: 'Order created',
      fromAddress: 'from@test.local',
      ccAddress: 'cc@test.local',
      bccAddress: 'bcc@test.local',
      subject: 'Hello',
      contentType: 'text/plain',
      templateBody: 'Body',
      templateVariables: '{orderId}',
      bodyScreenLocation: '/screen',
      xslfoAttachScreenLocation: '/attach',
      active: false,
    } as EmailTemplateSetting);

    expect(component.selectedTemplateId()).toBe(5);
    expect(component.templateForm.getRawValue().emailTemplateSettingId).toBe('T-5');
    expect(component.templateForm.getRawValue().active).toBeFalse();
  });

  it('guards invalid save and handles create/update success and error branches', () => {
    component.saveTemplate();
    expect(component.templateForm.touched).toBeTrue();

    component.templateForm.patchValue({
      emailType: 'ORDER_CREATED',
      description: 'Order created',
      subject: 'Subject',
      contentType: 'text/html',
      templateBody: '<p>Body</p>',
    });
    spyOn(component, 'loadTemplates').and.stub();
    service.createTemplate.and.returnValue(of({ id: 11 } as EmailTemplateSetting));

    component.saveTemplate();

    expect(service.createTemplate).toHaveBeenCalledWith(jasmine.objectContaining({
      emailType: 'ORDER_CREATED',
      description: 'Order created',
      subject: 'Subject',
    }));
    expect(snackbar.showSuccess).toHaveBeenCalledWith('COMMON.SAVE_SUCCESS');
    expect(component.selectedTemplateId()).toBe(11);

    component.templateForm.patchValue({ id: 11 });
    service.updateTemplate.and.returnValue(of({ id: 11 } as EmailTemplateSetting));
    component.saveTemplate();
    expect(service.updateTemplate).toHaveBeenCalledWith(11, jasmine.objectContaining({ id: 11 }));

    service.updateTemplate.and.returnValue(throwError(() => new Error('update failed')));
    component.saveTemplate();
    expect(snackbar.showError).toHaveBeenCalledWith('COMMON.ERROR');
  });

  it('guards delete, handles confirmation, preview, and test-email branches', () => {
    spyOn(component, 'loadTemplates').and.stub();
    component.deleteTemplate();
    expect(service.deleteTemplate).not.toHaveBeenCalled();

    spyOn(window, 'confirm').and.returnValue(false);
    component.templateForm.patchValue({ id: 9 });
    component.deleteTemplate();
    expect(service.deleteTemplate).not.toHaveBeenCalled();

    (window.confirm as jasmine.Spy).and.returnValue(true);
    service.deleteTemplate.and.returnValue(of(void 0));
    service.listTemplates.and.returnValue(of([]));
    component.deleteTemplate();
    expect(service.deleteTemplate).toHaveBeenCalledWith(9);
    expect(snackbar.showSuccess).toHaveBeenCalledWith('COMMON.DELETE_SUCCESS');
    expect(component.selectedTemplateId()).toBeNull();

    component.templateForm.patchValue({ id: 8, description: 'Preview template' });
    service.previewTemplate.and.returnValue(of({
      subject: 'Subject',
      body: '<p>Body</p>',
      contentType: 'text/html',
      resolvedLocale: 'hi',
      subjectSource: 'LOCAL_FILE',
      bodySource: 'LOCAL_FILE',
    } as EmailTemplatePreviewResponse));
    component.previewLocale.set('hi');
    component.previewTemplate();
    expect(service.previewTemplate).toHaveBeenCalledWith(8, jasmine.any(Object), 'hi');
    expect(component.preview()?.resolvedLocale).toBe('hi');

    component.testEmailForm.reset();
    component.sendTestEmail();
    expect(component.testEmailForm.touched).toBeTrue();

    component.testEmailForm.patchValue({ toAddress: 'qa@test.local' });
    service.sendTestEmail.and.returnValue(of({ communicationEventId: 'COMM-10001', statusId: 'EMAIL_SENT' }));
    spyOn(component, 'loadHistory').and.stub();
    component.sendTestEmail();
    expect(service.sendTestEmail).toHaveBeenCalledWith(8, 'qa@test.local', jasmine.any(Object), 'hi');
    expect(snackbar.showSuccess).toHaveBeenCalledWith('SYSTEM.TEST_EMAIL_SENT');
    expect(component.loadHistory).toHaveBeenCalled();

    service.sendTestEmail.and.returnValue(throwError(() => new Error('send failed')));
    component.sendTestEmail();
    expect(snackbar.showError).toHaveBeenCalledWith('COMMON.ERROR');
  });

  it('covers history reference and source label helpers', () => {
    expect(component.previewSourceLabel('LOCAL_FILE')).toBe('SYSTEM.LOCAL_TEMPLATE_SOURCE');
    expect(component.previewSourceLabel('DATABASE')).toBe('SYSTEM.DATABASE_TEMPLATE_SOURCE');
    expect(component.historyReference({ referenceType: 'ORDER', referenceId: 'PO-1' } as CommunicationEventSummary)).toBe('ORDER: PO-1');
    expect(component.historyReference({ referenceType: '', referenceId: 'PO-1' } as CommunicationEventSummary)).toBe('PO-1');
    expect(component.previewLocale()).toBe('en');
  });
});
