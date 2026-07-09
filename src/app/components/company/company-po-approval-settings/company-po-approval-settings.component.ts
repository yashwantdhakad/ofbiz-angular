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
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompanyMaterialModule } from '../../common/material/company-material.module';
import { ApiService } from '../../../services/common/api.service';
import { SnackbarService } from '../../../services/common/snackbar.service';
import { CompanyService } from '../../../services/company/company.service';

interface PoApprovalBand {
  bandId?: string;
  label?: string;
  maxAmount?: number | null;
  unlimited?: boolean;
  sequenceNum?: number;
}

interface PoApprovalPolicyData {
  enabled?: boolean;
  bands?: PoApprovalBand[];
}

type PoApprovalBandFormGroup = FormGroup<{
  bandId: FormControl<string>;
  label: FormControl<string>;
  maxAmount: FormControl<number | null>;
  unlimited: FormControl<boolean>;
  sequenceNum: FormControl<number>;
}>;

@Component({
  selector: 'app-company-po-approval-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, CompanyMaterialModule],
  templateUrl: './company-po-approval-settings.component.html',
  styleUrls: ['./company-po-approval-settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyPoApprovalSettingsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly context = computed(() => this.companyService.contextSignal());
  readonly companyPartyId = computed(() => (this.context()?.companyPartyId || 'COMPANY').toString().trim());
  readonly poApprovalColumns: string[] = ['label', 'maxAmount', 'action'];
  readonly poApprovalForm = this.formBuilder.group({
    enabled: this.formBuilder.nonNullable.control(false),
    bands: this.formBuilder.array<PoApprovalBandFormGroup>([]),
  });

  poApprovalExpanded = false;
  poApprovalLoading = false;
  poApprovalBandsControls: PoApprovalBandFormGroup[] = [];
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
        this.loadPurchaseOrderApprovalPolicy();
      }
    });
  }

  get poApprovalBands(): FormArray<PoApprovalBandFormGroup> {
    return this.poApprovalForm.controls.bands;
  }

  trackByPoApprovalBand = (_: number, bandGroup: PoApprovalBandFormGroup): string =>
    bandGroup.controls.bandId.value || `${bandGroup.controls.label.value || ''}::${_}`;

  addPoApprovalBand(): void {
    const nextIndex = this.poApprovalBands.length;
    this.poApprovalBands.push(this.createPoApprovalBandGroup({
      bandId: `PO_BAND_${nextIndex + 1}`,
      label: '',
      maxAmount: null,
      unlimited: false,
      sequenceNum: nextIndex,
    }));
    this.updateDataSource();
  }

  removePoApprovalBand(index: number): void {
    if (index < 0 || index >= this.poApprovalBands.length) {
      return;
    }
    this.poApprovalBands.removeAt(index);
    this.resequencePoApprovalBands();
    this.updateDataSource();
  }

  onPoApprovalUnlimitedChange(index: number): void {
    const bandGroup = this.poApprovalBands.at(index);
    if (!bandGroup) {
      return;
    }
    if (bandGroup.controls.unlimited.value) {
      bandGroup.controls.maxAmount.setValue(null);
    }
    bandGroup.updateValueAndValidity();
  }

  savePurchaseOrderApprovalPolicy(): void {
    const companyPartyId = this.companyPartyId();
    if (!companyPartyId) {
      return;
    }
    if (this.poApprovalForm.invalid) {
      this.poApprovalForm.markAllAsTouched();
      this.snackbarService.showError(this.translate.instant('COMPANY.PO_APPROVAL_POLICY_SAVE_ERROR'));
      return;
    }
    const policy = this.poApprovalForm.getRawValue();
    const payload = {
      enabled: !!policy?.enabled,
      bands: (policy?.bands || []).map((band, index) => ({
        bandId: (band?.bandId || `PO_BAND_${index + 1}`).toString(),
        label: (band?.label || '').toString().trim(),
        maxAmount: band?.unlimited ? null : this.normalizeNullableNumber(band?.maxAmount),
        unlimited: !!band?.unlimited,
        sequenceNum: index,
      })),
    };
    this.apiService.put<any>(`/oms/api/purchase-order-approval-policies/${encodeURIComponent(companyPartyId)}`, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: PoApprovalPolicyData) => {
          this.applyPoApprovalPolicy(response);
          this.snackbarService.showSuccess(this.translate.instant('COMPANY.PO_APPROVAL_POLICY_SAVE_SUCCESS'));
        },
        error: (error) => {
          const message = error?.error?.message || this.translate.instant('COMPANY.PO_APPROVAL_POLICY_SAVE_ERROR');
          this.snackbarService.showError(message);
        },
      });
  }

  private loadPurchaseOrderApprovalPolicy(): void {
    const companyPartyId = this.companyPartyId();
    if (!companyPartyId || this.poApprovalLoading) {
      return;
    }
    this.poApprovalLoading = true;
    this.apiService.get<any>(`/oms/api/purchase-order-approval-policies/${encodeURIComponent(companyPartyId)}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: PoApprovalPolicyData) => {
          this.poApprovalLoading = false;
          this.applyPoApprovalPolicy(response);
        },
        error: () => {
          this.poApprovalLoading = false;
          this.applyPoApprovalPolicy({ enabled: false, bands: [] });
        },
      });
  }

  private applyPoApprovalPolicy(policy: PoApprovalPolicyData | null | undefined): void {
    this.poApprovalForm.controls.enabled.setValue(!!policy?.enabled);
    this.setPoApprovalBands(Array.isArray(policy?.bands) ? policy.bands : []);
  }

  private setPoApprovalBands(bands: PoApprovalBand[]): void {
    this.poApprovalBands.clear();
    bands.forEach((band, index) => {
      this.poApprovalBands.push(this.createPoApprovalBandGroup({
        ...band,
        bandId: (band?.bandId || `PO_BAND_${index + 1}`).toString(),
        label: (band?.label || '').toString(),
        maxAmount: band?.maxAmount ?? null,
        unlimited: !!band?.unlimited,
        sequenceNum: typeof band?.sequenceNum === 'number' ? band.sequenceNum : index,
      }));
    });
    this.resequencePoApprovalBands();
    this.updateDataSource();
  }

  private updateDataSource(): void {
    this.poApprovalBandsControls = [...this.poApprovalBands.controls];
    this.cdr.markForCheck();
  }

  private createPoApprovalBandGroup(band: PoApprovalBand): PoApprovalBandFormGroup {
    return this.formBuilder.group({
      bandId: this.formBuilder.nonNullable.control((band?.bandId || '').toString()),
      label: this.formBuilder.nonNullable.control((band?.label || '').toString(), Validators.required),
      maxAmount: this.formBuilder.control<number | null>(band?.maxAmount ?? null),
      unlimited: this.formBuilder.nonNullable.control(!!band?.unlimited),
      sequenceNum: this.formBuilder.nonNullable.control(typeof band?.sequenceNum === 'number' ? band.sequenceNum : 0),
    }, { validators: this.poApprovalBandValidator() });
  }

  private resequencePoApprovalBands(): void {
    this.poApprovalBands.controls.forEach((group, index) => {
      group.controls.sequenceNum.setValue(index, { emitEvent: false });
      if (!group.controls.bandId.value) {
        group.controls.bandId.setValue(`PO_BAND_${index + 1}`, { emitEvent: false });
      }
    });
  }

  private poApprovalBandValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const label = control.get('label')?.value?.toString().trim() || '';
      const unlimited = !!control.get('unlimited')?.value;
      const rawAmount = control.get('maxAmount')?.value;
      const amount = rawAmount === null || rawAmount === '' ? null : Number(rawAmount);
      if (!label) {
        return { labelRequired: true };
      }
      if (unlimited) {
        return null;
      }
      if (amount === null || !Number.isFinite(amount) || amount < 0) {
        return { maxAmountInvalid: true };
      }
      return null;
    };
  }

  private normalizeNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }
}
