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
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { CrmService, SalesOpportunity, SalesOpportunityStage } from '../../../services/crm/crm.service';

@Component({
  selector: 'app-opportunity-edit-dialog',
  templateUrl: './opportunity-edit-dialog.component.html',
  styleUrls: ['./opportunity-edit-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OpportunityEditDialogComponent {
  readonly isSaving = signal(false);

  readonly form = this.fb.group({
    opportunityName: [this.data.opportunity.opportunityName || '', Validators.required],
    opportunityStageId: [this.data.opportunity.opportunityStageId || '', Validators.required],
    estimatedAmount: [this.data.opportunity.estimatedAmount ?? 0, [Validators.min(0)]],
    estimatedProbability: [this.data.opportunity.estimatedProbability ?? null, [Validators.min(0), Validators.max(100)]],
    estimatedCloseDate: [this.toDate(this.data.opportunity.estimatedCloseDate)],
    nextStep: [this.data.opportunity.nextStep || ''],
  });

  constructor(
    private fb: FormBuilder,
    private crmService: CrmService,
    private dialogRef: MatDialogRef<OpportunityEditDialogComponent, SalesOpportunity | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: {
      opportunity: SalesOpportunity;
      stages: SalesOpportunityStage[];
    },
  ) {}

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    const payload: Partial<SalesOpportunity> = {
      ...this.data.opportunity,
      opportunityName: raw.opportunityName || '',
      opportunityStageId: raw.opportunityStageId || '',
      estimatedAmount: raw.estimatedAmount ?? 0,
      estimatedProbability: raw.estimatedProbability ?? undefined,
      nextStep: raw.nextStep || undefined,
      estimatedCloseDate: this.toLocalDateTime(raw.estimatedCloseDate),
    };
    this.crmService.updateOpportunity(this.data.opportunity.id, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (saved) => this.dialogRef.close(saved),
      });
  }

  cancel(): void {
    this.dialogRef.close();
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
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }
}
