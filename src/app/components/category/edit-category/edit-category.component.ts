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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-edit-category',
  templateUrl: './edit-category.component.html',
  styleUrls: ['./edit-category.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCategoryComponent {
  updateCategoryForm: FormGroup;
  readonly isLoading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<EditCategoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { categoryDetail: any },
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const { productCategoryId, productCategoryTypeId, primaryParentCategoryId, categoryName, description, longDescription } =
      this.data?.categoryDetail ?? {};

    this.updateCategoryForm = this.fb.group({
      productCategoryId: [productCategoryId],
      productCategoryTypeId: [productCategoryTypeId, Validators.required],
      primaryParentCategoryId: [primaryParentCategoryId || ''],
      categoryName: [categoryName, Validators.required],
      description: [description],
      longDescription: [longDescription],
    });
  }

  updateCategory(): void {
    if (this.updateCategoryForm.invalid) {
      this.updateCategoryForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const values = this.updateCategoryForm.value;

    this.categoryService
      .updateCategory(values)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.updateCategoryForm.reset();
          this.dialogRef.close(values);
          this.snackbarService.showSuccess(this.translate.instant('CATEGORY.UPDATED_SUCCESS'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('CATEGORY.UPDATED_ERROR'));
        },
      });
  }

}
