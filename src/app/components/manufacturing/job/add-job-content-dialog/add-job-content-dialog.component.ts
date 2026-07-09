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
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AddJobContentDialogResult } from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: false,
  selector: 'app-add-job-content-dialog',
  templateUrl: './add-job-content-dialog.component.html',
  styleUrls: ['./add-job-content-dialog.component.css'],
})
export class AddJobContentDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddJobContentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { contentType?: string } | null
  ) {
    this.form = this.fb.group({
      workEffortContentTypeId: [data?.contentType || 'DOCUMENT', Validators.required],
      contentFile: [null, Validators.required],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const formData = new FormData();
    formData.append('uploadedFile', this.form.value.contentFile);
    const result: AddJobContentDialogResult = {
      formData,
      workEffortContentTypeId: this.form.value.workEffortContentTypeId || 'DOCUMENT',
    };
    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.form.patchValue({ contentFile: file });
  }
}
