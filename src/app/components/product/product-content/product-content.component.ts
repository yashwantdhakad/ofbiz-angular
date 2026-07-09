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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { ProductContentDialogData } from '@ofbiz/models/product.model';

@Component({
  standalone: false,
  selector: 'app-product-content',
  templateUrl: './product-content.component.html',
  styleUrls: ['./product-content.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductContentComponent implements OnInit {
  fileForm!: FormGroup;
  isLoading = signal(false);
  selectedFile: File | null = null;

  constructor(
    public dialogRef: MatDialogRef<ProductContentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { contentData: ProductContentDialogData },
    private fb: FormBuilder,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.fileForm = this.fb.group({
      contentFile: [null, Validators.required],
      description: ['', Validators.required],
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const contentFile = input?.files?.[0] || null;
    this.selectedFile = contentFile || null;
    this.fileForm.get('contentFile')?.setValue(this.selectedFile ? this.selectedFile.name : null);
    this.fileForm.get('contentFile')?.markAsTouched();
  }

  createProductContent(): void {
    if (!this.fileForm.valid || !this.selectedFile) {
      this.fileForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const formData = new FormData();

    formData.append('productId', this.data.contentData.productId.toString());
    formData.append('description', this.fileForm.get('description')?.value || '');
    formData.append('uploadedFile', this.selectedFile);

    this.productService
      .createProductContent(this.data.contentData.productId, formData)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(
            this.translate.instant('PRODUCT.CONTENT_SAVE_SUCCESS')
          );
          this.selectedFile = null;
          this.fileForm.reset();
          this.dialogRef.close(this.data.contentData);
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant('PRODUCT.CONTENT_SAVE_ERROR')
          );
        },
      });
  }
}
