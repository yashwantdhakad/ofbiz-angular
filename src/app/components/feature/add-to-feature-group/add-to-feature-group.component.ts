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
import { TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, distinctUntilChanged, startWith, switchMap, finalize, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: false,
  selector: 'app-add-to-feature-group',
  templateUrl: './add-to-feature-group.component.html',
  styleUrls: ['./add-to-feature-group.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddToFeatureGroupComponent implements OnInit {
  createProductFeatureGroupApplForm: FormGroup;
  readonly isLoading = signal(false);
  filteredGroups$!: Observable<any[]>;
  isNew: boolean;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<AddToFeatureGroupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { featureGroupData: any },
    private fb: FormBuilder,
    private featureService: FeatureService,
    private featureGroupService: FeatureGroupService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const {
      id,
      productFeatureId,
      productFeatureGroupId,
      isNew,
      sequenceNum,
      fromDate,
    } = this.data?.featureGroupData ?? {};

    this.isNew = isNew;

    this.createProductFeatureGroupApplForm = this.fb.group({
      id: [id],
      productFeatureId: [productFeatureId],
      productFeatureGroupId: [productFeatureGroupId, Validators.required],
      sequenceNum: [sequenceNum],
      fromDate: [fromDate],
    });
  }

  ngOnInit(): void {
    this.filteredGroups$ = this.createProductFeatureGroupApplForm.get('productFeatureGroupId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value =>
        value && value.length > 0
          ? this.featureGroupService.getFeatureGroups(0, value).pipe(
              map(res => res.body ?? []),
              catchError(() => {
                this.snackbarService.showError(this.translate.instant('FEATUREGROUP.FETCH_ERROR'));
                return of([]);
              })
            )
          : of([])
      ),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  displayGroup(group: any): string {
    if (!group) {
      return '';
    }
    if (typeof group === 'string') {
      return group;
    }
    return group.description || group.productFeatureGroupId || '';
  }

  createProductFeatureGroupAppl(): void {
    if (this.createProductFeatureGroupApplForm.valid) {
      this.isLoading.set(true);
      const values = this.createProductFeatureGroupApplForm.value;
      const payload = {
        ...values,
        productFeatureGroupId: values?.productFeatureGroupId?.productFeatureGroupId ?? values?.productFeatureGroupId,
      };

      const operation$ = values.id
        ? this.featureService.updateProductFeatureGroupAppl(payload)
        : this.featureService.createProductFeatureGroupAppl(payload);

      operation$
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: () => {
            const messageKey = values.id
              ? 'FEATUREGROUP.APPLICATION_UPDATE_SUCCESS'
              : 'FEATUREGROUP.APPLICATION_CREATE_SUCCESS';

            this.snackbarService.showSuccess(this.translate.instant(messageKey));
            this.dialogRef.close(payload);
          },
          error: (_err) => {
            this.snackbarService.showError(this.translate.instant('FEATUREGROUP.APPLICATION_SAVE_ERROR'));
          }
        });
    }
  }
}
