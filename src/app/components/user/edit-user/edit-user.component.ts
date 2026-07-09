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
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { UserLoginInfo, UserUpdatePayload } from '@ofbiz/models/user.model';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { UserService } from '@ofbiz/services/security/user.service';

@Component({
  standalone: false,
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserComponent {
  readonly isLoading = signal(false);

  userForm = this.fb.group({
    userLoginId: [{ value: '', disabled: true }],
    password: [''],
    firstName: [''],
    lastName: [''],
    enabled: [true, Validators.required],
    requirePasswordChange: [false],
  });

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    public dialogRef: MatDialogRef<EditUserComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      userLoginId: string;
      user: UserLoginInfo;
    }
  ) {
    this.userForm.patchValue({
      userLoginId: data?.userLoginId,
      firstName: data?.user?.firstName || '',
      lastName: data?.user?.lastName || '',
      enabled: this.toBoolean(data?.user?.enabled, true),
      requirePasswordChange: data?.user?.requirePasswordChange ?? false,
    });
  }

  updateUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const rawValue = this.userForm.getRawValue();
    const userLoginId = this.data?.userLoginId || rawValue.userLoginId || '';
    const payload: UserUpdatePayload = {
      firstName: rawValue.firstName || '',
      lastName: rawValue.lastName || '',
      enabled: rawValue.enabled ?? true,
      requirePasswordChange: rawValue.requirePasswordChange ?? false,
    };
    if (rawValue.password) {
      payload.password = rawValue.password;
    }

    this.userService
      .updateUser(userLoginId, payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('USER.UPDATE_SUCCESS'));
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('USER.UPDATE_ERROR'));
        },
      });
  }

  private toBoolean(value: boolean | string | null | undefined, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'true';
    }
    return fallback;
  }
}
