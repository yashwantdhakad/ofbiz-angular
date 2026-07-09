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
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductIdentificationType } from '@ofbiz/models/product.model';
import { ProductService } from '@ofbiz/services/product/product.service';
import { TranslateService } from '@ngx-translate/core';

interface ProductIdentificationData {
  id?: number;
  productId?: string;
  goodIdentificationTypeId?: string;
  idValue?: string;
}

@Component({
  standalone: false,
  selector: 'app-add-edit-product-identification',
  templateUrl: './add-edit-product-identification.component.html',
  styleUrls: ['./add-edit-product-identification.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditProductIdentificationComponent implements OnInit {
  form: FormGroup;
  readonly isSaving = signal(false);
  idTypes: ProductIdentificationType[] = [];
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    public dialogRef: MatDialogRef<AddEditProductIdentificationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { identificationData: ProductIdentificationData }
  ) {
    const identification = this.data?.identificationData || {};
    this.form = this.fb.group({
      id: [identification.id || null],
      productId: [identification.productId, Validators.required],
      goodIdentificationTypeId: [identification.goodIdentificationTypeId || '', Validators.required],
      idValue: [identification.idValue || '', Validators.required],
    });
  }

  ngOnInit(): void {
    this.productService.getGoodIdentificationTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (types) => {
        this.idTypes = Array.isArray(types) ? types : [];
      },
      error: () => {
        this.idTypes = [];
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.value;
    const id = payload.id;
    this.isSaving.set(true);
    const request$ = id
      ? this.productService.updateGoodIdentification(id, payload)
      : this.productService.createGoodIdentification(payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          const successKey = id ? 'PRODUCT.IDENTIFICATION_UPDATED_SUCCESS' : 'PRODUCT.IDENTIFICATION_ADDED_SUCCESS';
          this.snackbarService.showSuccess(this.translate.instant(successKey));
          this.dialogRef.close(saved || true);
        },
        error: () => {
          this.isSaving.set(false);
          const errorKey = id ? 'PRODUCT.IDENTIFICATION_UPDATED_ERROR' : 'PRODUCT.IDENTIFICATION_ADDED_ERROR';
          this.snackbarService.showError(this.translate.instant(errorKey));
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
