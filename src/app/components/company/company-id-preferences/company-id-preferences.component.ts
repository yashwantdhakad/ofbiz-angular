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
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompanyMaterialModule } from '../../common/material/company-material.module';
import { ApiService } from '../../../services/common/api.service';
import { SnackbarService } from '../../../services/common/snackbar.service';
import { CompanyService } from '../../../services/company/company.service';

interface IdPreference {
  idType?: string;
  prefix?: string;
  nextValue?: number;
  scopeType?: string;
  scopeKey?: string;
  service?: 'OMS' | 'WMS';
}

interface IdPreferenceFormValue {
  idType: string;
  prefix: string;
  nextValue: number;
}

@Component({
  selector: 'app-company-id-preferences',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, CompanyMaterialModule],
  templateUrl: './company-id-preferences.component.html',
  styleUrls: ['./company-id-preferences.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyIdPreferencesComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly context = computed(() => this.companyService.contextSignal());
  readonly companyPartyId = computed(() => (this.context()?.companyPartyId || 'COMPANY').toString().trim());

  readonly idPreferenceColumns: string[] = ['service', 'idType', 'prefix', 'nextValue'];
  readonly omsIdTypeOptions: string[] = ['ORDER', 'INVOICE', 'PO'];
  readonly wmsIdTypeOptions: string[] = ['PICKLIST', 'SHIPMENT', 'INVENTORY', 'JOB'];
  readonly unifiedIdTypeOptions: string[] = ['ORDER', 'INVOICE', 'PO', 'PICKLIST', 'SHIPMENT', 'INVENTORY', 'JOB'];
  readonly idPreferenceForm = this.formBuilder.nonNullable.group({
    idType: ['ORDER', Validators.required],
    prefix: [''],
    nextValue: [10000, [Validators.required, Validators.min(1)]],
  });

  idPreferencesLoading = false;
  idPreferencesExpanded = false;
  readonly omsIdPreferences = signal<IdPreference[]>([]);
  readonly wmsIdPreferences = signal<IdPreference[]>([]);

  private initialized = false;

  constructor(
    private readonly apiService: ApiService,
    private readonly companyService: CompanyService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
  ) {
    effect(() => {
      const ctx = this.context();
      if (ctx && !ctx.loading && ctx.companyPartyId && !this.initialized) {
        this.initialized = true;
        this.loadIdPreferences();
      }
    });
  }

  trackByIdPreference = (_: number, item: IdPreference): string => `${item?.idType || ''}::${item?.prefix || ''}::${item?.nextValue || _}`;

  saveIdPreference(): void {
    if (this.idPreferenceForm.invalid) {
      this.idPreferenceForm.markAllAsTouched();
      this.snackbarService.showError(this.translate.instant('COMPANY.ID_PREFERENCE_INVALID'));
      return;
    }
    const idPreferenceFormValue = this.idPreferenceForm.getRawValue();
    const selectedIdType = idPreferenceFormValue.idType;
    const isOmsType = this.omsIdTypeOptions.includes(selectedIdType);
    const currentPreferences = isOmsType ? this.omsIdPreferences() : this.wmsIdPreferences();
    if (!this.validateNextValueNotLower(currentPreferences, selectedIdType, idPreferenceFormValue.nextValue)) {
      return;
    }
    const payload = this.buildPreferencePayload(idPreferenceFormValue);
    if (!payload) {
      return;
    }
    const request$ = isOmsType
      ? this.apiService.put<IdPreference>('/oms/api/id-generation/preferences', payload)
      : this.apiService.putWms<IdPreference>('/wms/api/id-generation/preferences', payload);
    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('COMPANY.ID_PREFERENCE_SAVED'));
          this.loadIdPreferences();
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('COMPANY.ID_PREFERENCE_SAVE_ERROR'));
        },
      });
  }

  allIdPreferences(): IdPreference[] {
    return [...this.omsIdPreferences(), ...this.wmsIdPreferences()];
  }

  private loadIdPreferences(): void {
    if (this.idPreferencesLoading) {
      return;
    }
    this.idPreferencesLoading = true;
    forkJoin({
      oms: this.apiService.get<IdPreference[]>('/oms/api/id-generation/preferences').pipe(catchError(() => of([]))),
      wms: this.apiService.getWms<IdPreference[]>('/wms/api/id-generation/preferences').pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ oms, wms }) => {
          this.omsIdPreferences.set(this.filterScopedPreferences(Array.isArray(oms) ? oms : [], this.omsIdTypeOptions, 'OMS'));
          this.wmsIdPreferences.set(this.filterScopedPreferences(Array.isArray(wms) ? wms : [], this.wmsIdTypeOptions, 'WMS'));
          this.idPreferencesLoading = false;
        },
        error: () => {
          this.idPreferencesLoading = false;
          this.omsIdPreferences.set([]);
          this.wmsIdPreferences.set([]);
        },
      });
  }

  private buildPreferencePayload(model: IdPreferenceFormValue): IdPreference | null {
    const idType = (model?.idType || '').toString().trim().toUpperCase();
    const prefix = (model?.prefix || '').toString();
    const nextValue = Number(model?.nextValue || 0);
    const scopeType = 'COMPANY';
    const scopeKey = this.companyPartyId();

    if (!idType || !scopeKey || !Number.isFinite(nextValue) || nextValue < 1) {
      this.snackbarService.showError(this.translate.instant('COMPANY.ID_PREFERENCE_INVALID'));
      return null;
    }
    return { idType, scopeType, scopeKey, prefix, nextValue };
  }

  private filterScopedPreferences(items: IdPreference[], allowedIdTypes: string[], service: 'OMS' | 'WMS'): IdPreference[] {
    const allowed = new Set((allowedIdTypes || []).map((item) => (item || '').toString().toUpperCase()));
    const companyScopeKey = this.companyPartyId().toUpperCase();
    return items.filter((item) => {
      const idType = (item?.idType || '').toString().trim().toUpperCase();
      const scopeType = (item?.scopeType || '').toString().trim().toUpperCase();
      const scopeKey = (item?.scopeKey || '').toString().trim().toUpperCase();
      if (!allowed.has(idType)) {
        return false;
      }
      return scopeType === 'COMPANY' && scopeKey === companyScopeKey;
    }).map((item) => ({ ...item, service }));
  }

  private validateNextValueNotLower(preferences: IdPreference[], idTypeRaw: string, requestedNextValue: number): boolean {
    const idType = (idTypeRaw || '').toString().trim().toUpperCase();
    const nextValue = Number(requestedNextValue);
    if (!idType || !Number.isFinite(nextValue)) {
      return true;
    }
    const existing = (preferences || []).find((item) =>
      (item?.idType || '').toString().trim().toUpperCase() === idType
    );
    const currentValue = Number(existing?.nextValue);
    if (Number.isFinite(currentValue) && nextValue < currentValue) {
      this.snackbarService.showError(
        this.translate.instant('COMPANY.ID_PREFERENCE_CANNOT_DECREASE', { current: currentValue })
      );
      return false;
    }
    return true;
  }
}
