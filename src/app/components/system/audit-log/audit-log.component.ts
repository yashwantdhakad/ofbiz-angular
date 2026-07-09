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
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { AuditLogEntry, AuditLogService } from '@ofbiz/services/admin/audit-log.service';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  selector: 'app-audit-log',
  standalone: false,
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogComponent implements OnInit {
  private readonly pageSize = 50;

  readonly actionOptions = ['CREATE', 'UPDATE', 'DELETE'];
  readonly isLoading = signal(false);
  readonly isConfigLoading = signal(false);
  readonly isConfigSaving = signal(false);
  readonly entries = signal<AuditLogEntry[]>([]);
  readonly configuredEntityTypes = signal<string[]>([]);
  readonly availableEntityTypes = signal<string[]>([]);
  readonly usingDefaultConfig = signal(true);
  readonly page = signal(0);
  readonly hasNextPage = computed(() => this.entries().length === this.pageSize);
  readonly displayedColumns = ['changedAt', 'action', 'entity', 'changedBy', 'oldValue', 'newValue'];

  readonly filterForm = this.fb.group({
    entityType: this.fb.control(''),
    entityId: this.fb.control(''),
    action: this.fb.control(''),
    changedBy: this.fb.control(''),
    fromDate: this.fb.control<Date | null>(null),
    toDate: this.fb.control<Date | null>(null),
  });
  readonly configForm = this.fb.group({
    entityTypes: this.fb.control<string[]>([]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auditLogService: AuditLogService,
    private readonly authService: AuthService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.search();
  }

  search(): void {
    this.page.set(0);
    this.load();
  }

  clear(): void {
    this.filterForm.reset({
      entityType: '',
      entityId: '',
      action: '',
      changedBy: '',
      fromDate: null,
      toDate: null,
    });
    this.search();
  }

  previousPage(): void {
    if (this.page() === 0) {
      return;
    }
    this.page.update((value) => value - 1);
    this.load();
  }

  nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    const filters = this.filterForm.getRawValue();
    this.auditLogService.search({
      entityType: filters.entityType,
      entityId: filters.entityId,
      action: filters.action,
      changedBy: filters.changedBy,
      fromDate: this.toStartOfDayParam(filters.fromDate),
      toDate: this.toEndOfDayParam(filters.toDate),
      page: this.page(),
      size: this.pageSize,
    }).subscribe({
      next: (entries) => {
        this.entries.set(entries || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.isLoading.set(false);
      },
    });
  }

  loadConfig(): void {
    this.isConfigLoading.set(true);
    this.auditLogService.getEntityConfig().subscribe({
      next: (config) => {
        const entityTypes = config?.entityTypes || [];
        this.availableEntityTypes.set(config?.availableEntityTypes || []);
        this.configuredEntityTypes.set(entityTypes);
        this.usingDefaultConfig.set(Boolean(config?.usingDefault));
        this.configForm.patchValue({ entityTypes });
        this.isConfigLoading.set(false);
      },
      error: () => {
        this.availableEntityTypes.set([]);
        this.configuredEntityTypes.set([]);
        this.configForm.patchValue({ entityTypes: [] });
        this.isConfigLoading.set(false);
      },
    });
  }

  saveConfig(): void {
    const entityTypes = this.normalizeConfigEntityTypes(this.configForm.controls.entityTypes.value || []);
    this.isConfigSaving.set(true);
    this.auditLogService.saveEntityConfig(entityTypes).subscribe({
      next: (config) => {
        const savedEntityTypes = config?.entityTypes || [];
        this.availableEntityTypes.set(config?.availableEntityTypes || []);
        this.configuredEntityTypes.set(savedEntityTypes);
        this.usingDefaultConfig.set(Boolean(config?.usingDefault));
        this.configForm.patchValue({ entityTypes: savedEntityTypes });
        this.isConfigSaving.set(false);
        this.snackbarService.showSuccess(this.translate.instant('SYSTEM.AUDIT_CONFIG_SAVE_SUCCESS'));
      },
      error: () => {
        this.isConfigSaving.set(false);
        this.snackbarService.showError(this.translate.instant('SYSTEM.AUDIT_CONFIG_SAVE_ERROR'));
      },
    });
  }

  private normalizeConfigEntityTypes(value: string[]): string[] {
    const seen = new Set<string>();
    return value
      .map((item) => item.trim())
      .filter((item) => {
        const key = item.toLowerCase();
        if (!item || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  formatValue(value: string | null | undefined): string {
    return value && value.trim() ? value : '-';
  }

  private toStartOfDayParam(value: Date | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return this.toLocalDateTimeParam(date);
  }

  private toEndOfDayParam(value: Date | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return this.toLocalDateTimeParam(date);
  }

  private toLocalDateTimeParam(value: Date): string {
    const pad = (part: number, size = 2) => String(part).padStart(size, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      + `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
}
