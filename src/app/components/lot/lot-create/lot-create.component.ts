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
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { LotService } from '@ofbiz/services/lot/lot.service';
import { TranslateService } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
  standalone: false,
  selector: 'app-lot-create',
  templateUrl: './lot-create.component.html',
  styleUrls: ['./lot-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LotCreateComponent {
  readonly isLoading = signal(false);
  lotForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private lotService: LotService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private renderScheduler: RenderSchedulerService
  ) {
    this.lotForm = this.fb.group({
      lotId: ['', Validators.required],
      quantity: ['0'],
      expirationDate: [''],
      heatNumber: [''],
      steelGrade: [''],
      millCertNumber: [''],
      manufacturer: [''],
      yieldStrength: [''],
    });
  }

  createLot(): void {
    if (this.lotForm.invalid) {
      this.lotForm.markAllAsTouched();
      return;
    }

    const values = this.lotForm.value;
    const payload: any = {
      lotId: values.lotId,
      quantity: values.quantity || '0',
      creationDate: new Date().toISOString(),
      heatNumber: values.heatNumber || null,
      steelGrade: values.steelGrade || null,
      millCertNumber: values.millCertNumber || null,
      manufacturer: values.manufacturer || null,
      yieldStrength: values.yieldStrength ? String(values.yieldStrength) : null,
    };
    if (values.expirationDate) {
      payload.expirationDate = this.toDateStartOfDayIso(values.expirationDate);
    }

    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });

    this.lotService.createLot(payload)
      .pipe(
        finalize(() =>
          this.renderScheduler.deferMacrotask(() => {
            this.isLoading.set(false);
          })
        )
      )
      .subscribe({
        next: (data) => {
          const lotId = data?.lotId || values.lotId;
          this.snackbarService.showSuccess(this.translate.instant('LOT.CREATE_SUCCESS'));
          this.router.navigate(['/lots', lotId]);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('LOT.CREATE_ERROR'));
        },
      });
  }

  private toDateStartOfDayIso(value: Date | string): string {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate()).toISOString();
    }
    const parsed = new Date(value);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).toISOString();
  }
}
