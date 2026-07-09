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
import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentComponent implements OnInit {
  fileForm!: FormGroup;
  readonly isLoading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<ContentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { contentData: any },
    private fb: FormBuilder,
    private orderService: OrderService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.fileForm = this.fb.group({
      contentFile: [null, Validators.required],
      description: ['', Validators.required],
    });
  }

  onFileChange(event: any): void {
    const contentFile = event.target.files[0];
    this.fileForm.get('contentFile')?.setValue(contentFile);
  }

  createOrderContent(): void {
    if (!this.fileForm.valid) {
      this.fileForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const formData = new FormData();

    formData.append('orderId', this.data.contentData.orderId.toString());
    formData.append('description', this.fileForm.get('description')?.value);
    formData.append('uploadedFile', this.fileForm.get('contentFile')?.value);

    this.orderService
      .createOrderContent(formData)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
          this.fileForm.reset();
          this.snackbarService.showSuccess(this.translate.instant('ORDER.CONTENT_SAVE_SUCCESS'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('ORDER.CONTENT_SAVE_ERROR'));
        },
      });
  }
}
