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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-create-feature',
  templateUrl: './create-feature.component.html',
  styleUrls: ['./create-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFeatureComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly featureTypes = signal<any[]>([]);
  createFeatureForm: FormGroup;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private featureService: FeatureService,
    private snackbarService: SnackbarService,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService
  ) {
    this.createFeatureForm = this.formBuilder.group({
      productFeatureTypeId: ['', Validators.required],
      abbrev: ['', Validators.required],
      description: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.featureService.getProductFeatureTypes().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (types) => {
        this.featureTypes.set(Array.isArray(types) ? types : []);
      },
      error: () => {
        this.featureTypes.set([]);
      },
    });
  }

  createFeature(): void {
    if (this.createFeatureForm.invalid) {
      this.createFeatureForm.markAllAsTouched();
      return;
    }

    const values = this.createFeatureForm.value;
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });

    this.featureService.createFeature(values).pipe(
      finalize(() => {
        this.renderScheduler.deferMacrotask(() => {
          this.isLoading.set(false);
        });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data: any) => {
        if (!data?.productFeatureId) {
          this.snackbarService.showError(this.translate.instant('FEATURE.CREATE_ERROR'));
          return;
        }

        this.snackbarService.showSuccess(this.translate.instant('FEATURE.CREATE_SUCCESS'));
        this.createFeatureForm.reset();
        this.router.navigate([`/features/${data.productFeatureId}`]);
      },
      error: (_error) => {
        this.snackbarService.showError(this.translate.instant('FEATURE.CREATE_ERROR'));
      },
    });
  }

  trackByFeatureType = (_: number, featureType: any): any =>
    featureType?.productFeatureTypeId ?? featureType?.id ?? _;
}
