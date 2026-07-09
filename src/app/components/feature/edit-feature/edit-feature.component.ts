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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-edit-feature',
  templateUrl: './edit-feature.component.html',
  styleUrls: ['./edit-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFeatureComponent {
  featureForm: FormGroup;
  readonly isLoading = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<EditFeatureComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { featureDetail: any },
    private fb: FormBuilder,
    private featureService: FeatureService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const { productFeatureId, abbrev, description } = this.data?.featureDetail ?? {};

    this.featureForm = this.fb.group({
      productFeatureId: [productFeatureId],
      abbrev: [abbrev, Validators.required],
      description: [description, Validators.required],
    });
  }

  updateFeature(): void {
    if (this.featureForm.valid) {
      this.isLoading.set(true);
      const values = this.featureForm.value;

      this.featureService.updateFeature(values).pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('FEATURE.UPDATE_SUCCESS'));
          this.dialogRef.close(values);
        },
        error: (_error) => {
          this.snackbarService.showError(this.translate.instant('FEATURE.UPDATE_ERROR'));
        }
      });
    }
  }
}
