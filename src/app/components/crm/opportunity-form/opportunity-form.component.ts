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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CrmService, SalesOpportunity, SalesOpportunityStage } from '../../../services/crm/crm.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-opportunity-form',
  templateUrl: './opportunity-form.component.html',
  styleUrls: ['./opportunity-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OpportunityFormComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly stages = signal<SalesOpportunityStage[]>([]);
  readonly isEditMode = signal(false);
  private opportunityId: number | null = null;
  private readonly destroyRef = inject(DestroyRef);

  readonly opportunityForm = this.fb.group({
    salesOpportunityId: [''],
    opportunityName: ['', Validators.required],
    description: [''],
    nextStep: [''],
    estimatedAmount: [0, [Validators.min(0)]],
    estimatedProbability: [null as number | null, [Validators.min(0), Validators.max(100)]],
    currencyUomId: ['USD', Validators.required],
    estimatedCloseDate: [null as Date | null],
    opportunityStageId: ['', Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private crmService: CrmService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.isEditMode.set(this.route.snapshot.data?.['mode'] === 'edit');
    const id = this.route.snapshot.paramMap.get('id');
    this.opportunityId = id ? Number(id) : null;
    this.loadStages();
    if (this.isEditMode() && this.opportunityId) {
      this.loadOpportunity(this.opportunityId);
    }
  }

  save(): void {
    if (this.opportunityForm.invalid || this.isSaving()) {
      this.opportunityForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.opportunityForm.getRawValue() as Record<string, any>;
    const payload: Partial<SalesOpportunity> = {
      salesOpportunityId: formValue['salesOpportunityId'] || undefined,
      opportunityName: formValue['opportunityName'],
      description: formValue['description'],
      nextStep: formValue['nextStep'],
      estimatedAmount: formValue['estimatedAmount'],
      estimatedProbability: formValue['estimatedProbability'],
      currencyUomId: formValue['currencyUomId'],
      estimatedCloseDate: this.toLocalDateTime(formValue['estimatedCloseDate']),
      opportunityStageId: formValue['opportunityStageId'],
    };

    const request$ = this.isEditMode() && this.opportunityId
      ? this.crmService.updateOpportunity(this.opportunityId, payload)
      : this.crmService.createOpportunity(payload);

    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (saved) => {
          const targetId = saved?.id ?? this.opportunityId;
          this.snackbarService.showSuccess(
            this.translate.instant(this.isEditMode() ? 'CRM.UPDATE_SUCCESS' : 'CRM.CREATE_SUCCESS')
          );
          if (targetId) {
            this.router.navigate(['/crm/opportunities', targetId]);
          } else {
            this.router.navigate(['/crm/pipeline']);
          }
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant(this.isEditMode() ? 'CRM.UPDATE_ERROR' : 'CRM.CREATE_ERROR')
          );
        },
      });
  }

  private loadOpportunity(id: number): void {
    this.isLoading.set(true);
    this.crmService
      .getOpportunity(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (opportunity) => {
          this.opportunityForm.patchValue({
            salesOpportunityId: opportunity.salesOpportunityId || '',
            opportunityName: opportunity.opportunityName || '',
            description: opportunity.description || '',
            nextStep: opportunity.nextStep || '',
            estimatedAmount: opportunity.estimatedAmount ?? 0,
            estimatedProbability: opportunity.estimatedProbability ?? null,
            currencyUomId: opportunity.currencyUomId || 'USD',
            estimatedCloseDate: this.toDate(opportunity.estimatedCloseDate),
            opportunityStageId: opportunity.opportunityStageId || '',
          });
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('CRM.LOAD_OPPORTUNITY_ERROR'));
          this.router.navigate(['/crm/pipeline']);
        },
      });
  }

  private loadStages(): void {
    this.crmService.getStages()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stages) => {
          const normalized = Array.isArray(stages) ? stages : [];
          this.stages.set(normalized);
          if (!this.opportunityForm.get('opportunityStageId')?.value && normalized.length > 0) {
            this.opportunityForm.get('opportunityStageId')?.setValue(normalized[0].opportunityStageId);
          }
        },
        error: () => {
          this.stages.set([]);
        },
      });
  }

  trackByStage(_: number, stage: SalesOpportunityStage): string {
    return stage.opportunityStageId;
  }

  private toLocalDateTime(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = value instanceof Date ? value : this.toDate(String(value));
    if (!date) {
      return undefined;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }

  private toDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const datePart = String(value).slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }
}
