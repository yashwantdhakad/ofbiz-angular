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
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-party-content',
  templateUrl: './party-content.component.html',
  styleUrls: ['./party-content.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyContentComponent implements OnInit {
  fileForm!: FormGroup;
  isLoading = signal<boolean>(false);

  constructor(
    public dialogRef: MatDialogRef<PartyContentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { contentData: any },
    private fb: FormBuilder,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService
  ) { }

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

  createPartyContent(): void {
    if (!this.fileForm.valid) {
      this.fileForm.markAllAsTouched();
      return;
    }

    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });

    const formData = new FormData();
    const fileInputElement = document.getElementById('fileInput') as HTMLInputElement;

    formData.append('partyId', this.data.contentData.partyId.toString());

    if (fileInputElement?.files?.[0]) {
      formData.append('uploadedFile', fileInputElement.files[0]);
    }

    formData.append('description', this.fileForm.get('description')?.value || '');

    this.partyService.createPartyContent(formData).pipe(
      finalize(() => {
        this.renderScheduler.deferMacrotask(() => {
          this.isLoading.set(false);
          if (fileInputElement) {
            fileInputElement.value = '';
          }
        });
      })
    ).subscribe({
      next: () => {
        this.dialogRef.close(this.data?.contentData);
        this.snackbarService.showSuccess(
          this.translate.instant('PARTY.CONTENT_SAVE_SUCCESS')
        );
      },
      error: () => {
        this.snackbarService.showError(
          this.translate.instant('PARTY.CONTENT_SAVE_ERROR')
        );
      }
    });
  }
}
