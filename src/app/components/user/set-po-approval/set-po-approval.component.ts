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
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { UserService } from '@ofbiz/services/security/user.service';

@Component({
  standalone: false,
  selector: 'app-set-po-approval',
  templateUrl: './set-po-approval.component.html',
  styleUrls: ['./set-po-approval.component.css'],
})
export class SetPoApprovalComponent implements OnInit {
  isLoading = false;
  policy: any = { enabled: false, bands: [] };

  readonly form = this.fb.group({
    bandId: this.fb.control<string>(''),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
    public readonly dialogRef: MatDialogRef<SetPoApprovalComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: {
      userLoginId: string;
      companyPartyId: string;
      currentAssignment: any;
      policy: any;
    }
  ) {}

  ngOnInit(): void {
    this.policy = this.data?.policy || { enabled: false, bands: [] };
    this.form.patchValue({
      bandId: this.data?.currentAssignment?.bandId || '',
    });
    if (!this.policy?.enabled) {
      this.form.disable({ emitEvent: false });
    }
  }

  save(): void {
    if (!this.data?.userLoginId || !this.data?.companyPartyId) {
      return;
    }
    this.isLoading = true;
    this.userService
      .updatePurchaseOrderApprovalAssignment(this.data.userLoginId, this.data.companyPartyId, {
        bandId: this.form.getRawValue().bandId || '',
      })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.snackbarService.showSuccess(this.translate.instant('USER.PO_APPROVAL_ASSIGNMENT_UPDATED'));
          this.dialogRef.close(response);
        },
        error: (error) => {
          this.isLoading = false;
          const message =
            error?.error?.message || this.translate.instant('USER.PO_APPROVAL_ASSIGNMENT_UPDATE_ERROR');
          this.snackbarService.showError(message);
        },
      });
  }
}
