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
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-create-featuregroup',
  templateUrl: './create-featuregroup.component.html',
  styleUrls: ['./create-featuregroup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFeaturegroupComponent {
  readonly isLoading = signal(false);
  createFeatureGroupForm: FormGroup;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private featureGroupService: FeatureGroupService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    this.createFeatureGroupForm = this.formBuilder.group({
      description: ['', Validators.required],
    });
  }

  createFeatureGroup(): void {
    if (this.createFeatureGroupForm.invalid) {
      this.createFeatureGroupForm.markAllAsTouched();
      return;
    }

    const values = this.createFeatureGroupForm.value;
    this.isLoading.set(true);

    this.featureGroupService.createFeatureGroup(values).pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data: any) => {
        if (!data?.productFeatureGroupId) {
          this.snackbarService.showError(
            this.translate.instant('FEATUREGROUP.CREATE_MISSING_ID')
          );
          return;
        }

        this.snackbarService.showSuccess(this.translate.instant('FEATUREGROUP.CREATE_SUCCESS'));
        this.createFeatureGroupForm.reset();
        this.router.navigate([`/featuregroups/${data.productFeatureGroupId}`]);
      },
      error: (_error) => {
        this.snackbarService.showError(this.translate.instant('FEATUREGROUP.CREATE_ERROR'));
      }
    });
  }
}
