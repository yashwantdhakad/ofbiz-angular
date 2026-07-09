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
import { ChangeDetectionStrategy, Component, OnInit, signal, computed, SecurityContext } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import {
  CommunicationEventSummary,
  EmailNotificationAdminService,
  EmailTemplatePreviewResponse,
  EmailTemplateSetting,
} from '@ofbiz/services/admin/email-notification-admin.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  selector: 'app-email-notification-admin',
  standalone: false,
  templateUrl: './email-notification-admin.component.html',
  styleUrls: ['./email-notification-admin.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailNotificationAdminComponent implements OnInit {
  readonly isTemplatesLoading = signal(false);
  readonly isHistoryLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isSendingTest = signal(false);
  readonly templates = signal<EmailTemplateSetting[]>([]);
  readonly history = signal<CommunicationEventSummary[]>([]);
  readonly selectedTemplateId = signal<number | null>(null);
  readonly preview = signal<EmailTemplatePreviewResponse | null>(null);
  readonly previewHtml = computed<string | null>(() => {
    const body = this.preview()?.body;
    if (!body) return null;
    return this.sanitizer.sanitize(SecurityContext.HTML, body) || '';
  });
  readonly displayedTemplateColumns = ['emailType', 'description', 'active'];
  readonly displayedHistoryColumns = ['entryDate', 'emailType', 'statusId', 'reference', 'toAddress', 'subject'];

  readonly templateForm = this.fb.group({
    id: this.fb.control<number | null>(null),
    emailTemplateSettingId: this.fb.control(''),
    emailType: this.fb.control('', Validators.required),
    description: this.fb.control('', Validators.required),
    fromAddress: this.fb.control(''),
    ccAddress: this.fb.control(''),
    bccAddress: this.fb.control(''),
    subject: this.fb.control('', Validators.required),
    contentType: this.fb.control('text/html', Validators.required),
    templateBody: this.fb.control('', Validators.required),
    templateVariables: this.fb.control(''),
    bodyScreenLocation: this.fb.control(''),
    xslfoAttachScreenLocation: this.fb.control(''),
    active: this.fb.control(true, { nonNullable: true }),
  });

  readonly testEmailForm = this.fb.group({
    toAddress: this.fb.control('', [Validators.required, Validators.email]),
  });

  readonly previewLocale = signal(this.translate.currentLang || this.translate.getDefaultLang() || 'en');

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: EmailNotificationAdminService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
    this.loadHistory();
  }

  loadTemplates(): void {
    this.isTemplatesLoading.set(true);
    this.service.listTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates || []);
        this.isTemplatesLoading.set(false);
        const selectedId = this.selectedTemplateId();
        const selected = (templates || []).find((item) => selectedId != null && item.id === selectedId) || (templates || [])[0] || null;
        if (selected) {
          this.selectTemplate(selected);
        } else {
          this.createNew();
        }
      },
      error: () => {
        this.templates.set([]);
        this.isTemplatesLoading.set(false);
      },
    });
  }

  loadHistory(): void {
    this.isHistoryLoading.set(true);
    this.service.listCommunicationHistory().subscribe({
      next: (history) => {
        this.history.set(history || []);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.history.set([]);
        this.isHistoryLoading.set(false);
      },
    });
  }

  createNew(): void {
    this.selectedTemplateId.set(null);
    this.preview.set(null);
    this.templateForm.reset({
      id: null,
      emailTemplateSettingId: '',
      emailType: '',
      description: '',
      fromAddress: '',
      ccAddress: '',
      bccAddress: '',
      subject: '',
      contentType: 'text/html',
      templateBody: '',
      templateVariables: '',
      bodyScreenLocation: '',
      xslfoAttachScreenLocation: '',
      active: true,
    });
  }

  selectTemplate(template: EmailTemplateSetting): void {
    this.selectedTemplateId.set(template.id ?? null);
    this.preview.set(null);
    this.templateForm.reset({
      id: template.id ?? null,
      emailTemplateSettingId: template.emailTemplateSettingId ?? '',
      emailType: template.emailType ?? '',
      description: template.description ?? '',
      fromAddress: template.fromAddress ?? '',
      ccAddress: template.ccAddress ?? '',
      bccAddress: template.bccAddress ?? '',
      subject: template.subject ?? '',
      contentType: template.contentType ?? 'text/html',
      templateBody: template.templateBody ?? '',
      templateVariables: template.templateVariables ?? '',
      bodyScreenLocation: template.bodyScreenLocation ?? '',
      xslfoAttachScreenLocation: template.xslfoAttachScreenLocation ?? '',
      active: template.active ?? true,
    });
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    const payload = this.templateForm.getRawValue() as EmailTemplateSetting;
    const request$ = payload.id
      ? this.service.updateTemplate(payload.id, payload)
      : this.service.createTemplate(payload);

    request$.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.snackbarService.showSuccess(this.translate.instant('COMMON.SAVE_SUCCESS'));
        this.selectedTemplateId.set(saved.id ?? null);
        this.loadTemplates();
      },
      error: () => {
        this.isSaving.set(false);
        this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
      },
    });
  }

  deleteTemplate(): void {
    const id = this.templateForm.getRawValue().id;
    if (!id) {
      return;
    }
    if (!window.confirm(this.translate.instant('COMMON.DELETE_CONFIRMATION'))) {
      return;
    }
    this.service.deleteTemplate(id).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('COMMON.DELETE_SUCCESS'));
        this.createNew();
        this.loadTemplates();
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
      },
    });
  }

  previewTemplate(): void {
    const raw = this.templateForm.getRawValue();
    if (!raw.id) {
      return;
    }
    this.service.previewTemplate(raw.id, this.buildPreviewVariables(), this.previewLocale()).subscribe({
      next: (preview) => this.preview.set(preview),
      error: () => this.snackbarService.showError(this.translate.instant('COMMON.ERROR')),
    });
  }

  sendTestEmail(): void {
    const raw = this.templateForm.getRawValue();
    if (!raw.id) {
      return;
    }
    if (this.testEmailForm.invalid) {
      this.testEmailForm.markAllAsTouched();
      return;
    }
    this.isSendingTest.set(true);
    this.service.sendTestEmail(
      raw.id,
      this.testEmailForm.getRawValue().toAddress || '',
      this.buildPreviewVariables(),
      this.previewLocale()
    ).subscribe({
      next: () => {
        this.isSendingTest.set(false);
        this.snackbarService.showSuccess(this.translate.instant('SYSTEM.TEST_EMAIL_SENT'));
        this.loadHistory();
      },
      error: () => {
        this.isSendingTest.set(false);
        this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
      },
    });
  }

  previewSourceLabel(source?: string | null): string {
    return source === 'LOCAL_FILE'
      ? this.translate.instant('SYSTEM.LOCAL_TEMPLATE_SOURCE')
      : this.translate.instant('SYSTEM.DATABASE_TEMPLATE_SOURCE');
  }

  historyReference(item: CommunicationEventSummary): string {
    return [item.referenceType, item.referenceId].filter(Boolean).join(': ');
  }

  private buildPreviewVariables(): Record<string, string> {
    const raw = this.templateForm.getRawValue();
    return {
      orderId: 'ORD-10001',
      shipmentId: 'SHP-10001',
      returnId: 'RET-10001',
      statusId: 'ORDER_APPROVED',
      eventDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      recipientName: 'Demo Recipient',
      customerName: 'Demo Customer',
      vendorName: 'Demo Supplier',
      facilityId: 'MAIN',
      orderName: raw.description || 'Demo Order',
    };
  }
}
