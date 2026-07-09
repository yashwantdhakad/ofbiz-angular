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
  map,
  startWith,
  switchMap,
  finalize,
  catchError,
} from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-add-category-feature-group-appl',
  templateUrl: './add-category-feature-group-appl.component.html',
  styleUrls: ['./add-category-feature-group-appl.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCategoryFeatureGroupApplComponent implements OnInit {
  categoryFeatureGroupApplForm: FormGroup;
  readonly isLoading = signal(false);
  readonly enumTypes = signal<any[]>([]);
  filteredCategories$: Observable<any[]> = of([]);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<AddCategoryFeatureGroupApplComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { featureGroupCategoryData: any },
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private featureGroupService: FeatureGroupService,
    private commonService: CommonService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const {
      id,
      productFeatureGroupId,
      productCategoryId,
      applTypeEnumId,
      fromDate,
    } = this.data?.featureGroupCategoryData ?? {};

    this.categoryFeatureGroupApplForm = this.fb.group({
      id: [id],
      productFeatureGroupId: [productFeatureGroupId],
      applTypeEnumId: [applTypeEnumId || 'PfatStandard', Validators.required],
      productCategoryId: [productCategoryId, Validators.required],
      fromDate: [fromDate],
    });
  }

  ngOnInit(): void {
    this.loadEnumTypes();

    this.filteredCategories$ = this.categoryFeatureGroupApplForm
      .get('productCategoryId')!
      .valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value: string) =>
          value?.length > 0
            ? this.categoryService.getCategories(0, value).pipe(
                map((res: any) => res.body ?? []),
                catchError(() => {
                  this.snackbarService.showError(this.translate.instant('CATEGORY.FETCH_ERROR'));
                  return of([]);
                })
              )
            : of([])
        ),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  displayCategory(category: any): string {
    if (!category) {
      return '';
    }
    if (typeof category === 'string') {
      return category;
    }
    return category.categoryName || category.productCategoryId || '';
  }

  loadEnumTypes(): void {
    this.commonService.getEnumTypes('ProductFeatureApplType').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        this.enumTypes.set(Array.isArray(data) ? data : [data]);
      },
      error: (_error) => {
      },
    });
  }

  createProductCategoryFeatGrpAppl(): void {
    if (this.categoryFeatureGroupApplForm.valid) {
      this.isLoading.set(true);
      const values = this.categoryFeatureGroupApplForm.value;
      const payload = {
        ...values,
        productCategoryId: values?.productCategoryId?.productCategoryId ?? values?.productCategoryId,
      };

      const request$ = values.id
        ? this.featureGroupService.updateProductCategoryFeatGrpAppl(payload)
        : this.featureGroupService.createProductCategoryFeatGrpAppl(payload);

      request$
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(
              values.id
                ? this.translate.instant('FEATUREGROUP.APPLICATION_UPDATE_SUCCESS')
                : this.translate.instant('FEATUREGROUP.APPLICATION_CREATE_SUCCESS')
            );
            this.dialogRef.close(payload);
          },
          error: () => {
            this.snackbarService.showError(
              this.translate.instant('FEATUREGROUP.APPLICATION_SAVE_ERROR')
            );
          },
        });
    }
  }
}
