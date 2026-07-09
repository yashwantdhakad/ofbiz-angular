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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  finalize,
  map,
  catchError,
} from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-add-product-feature-group-appl',
  templateUrl: './add-product-feature-group-appl.component.html',
  styleUrls: ['./add-product-feature-group-appl.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProductFeatureGroupApplComponent implements OnInit {
  productFeatureGroupApplForm: FormGroup;
  readonly isLoading = signal(false);
  filteredFeatures$: Observable<any[]> = new Observable<any[]>();
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<AddProductFeatureGroupApplComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { featureGroupProductData: any },
    private fb: FormBuilder,
    private featureService: FeatureService,
    private featureGroupService: FeatureGroupService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const { id, productFeatureGroupId, productFeatureId, fromDate } =
      this.data?.featureGroupProductData ?? {};

    this.productFeatureGroupApplForm = this.fb.group({
      id: [id],
      productFeatureGroupId: [productFeatureGroupId],
      productFeatureId: [productFeatureId, Validators.required],
      fromDate: [fromDate],
    });
  }

  ngOnInit(): void {
    this.filteredFeatures$ = this.productFeatureGroupApplForm
      .get('productFeatureId')!
      .valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => this.getFeatures(value)),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  displayFeature(feature: any): string {
    if (!feature) {
      return '';
    }
    if (typeof feature === 'string') {
      return feature;
    }
    return feature.description || feature.abbrev || feature.productFeatureId || '';
  }

  public getFeatures(value: string): Observable<any[]> {
    if (!value || value.length < 1) {
      return of([]);
    }
    return this.featureService.getFeatures(0, value).pipe(
      map((response: any) => response.body ?? []),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('FEATURE.FETCH_ERROR'));
        return of([]);
      })
    );
  }

  createProductFeatGrpAppl(): void {
    if (this.productFeatureGroupApplForm.valid) {
      this.isLoading.set(true);
      const values = this.productFeatureGroupApplForm.value;
      const payload = {
        ...values,
        productFeatureId: values?.productFeatureId?.productFeatureId ?? values?.productFeatureId,
      };

      const request$ = values.id
        ? this.featureGroupService.updateProductFeatureGroupAppl(payload)
        : this.featureGroupService.createProductFeatureGroupAppl(payload);

      request$.pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          const message = values.id
            ? this.translate.instant('FEATUREGROUP.APPLICATION_UPDATE_SUCCESS')
            : this.translate.instant('FEATUREGROUP.APPLICATION_CREATE_SUCCESS');
          this.snackbarService.showSuccess(message);
          this.dialogRef.close(payload);
        },
        error: (_error) => {
          this.snackbarService.showError(this.translate.instant('FEATUREGROUP.APPLICATION_SAVE_ERROR'));
        },
      });
    }
  }
}
