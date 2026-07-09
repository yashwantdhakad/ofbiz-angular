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
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { UserService } from '@ofbiz/services/security/user.service';
import { SecurityGroup } from '@ofbiz/models/user.model';

@Component({
  standalone: false,
  selector: 'app-add-user-role',
  templateUrl: './add-user-role.component.html',
  styleUrls: ['./add-user-role.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddUserRoleComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly roles = () =>
    this.referenceDataStore.roles().filter((role: SecurityGroup) =>
      this.authService.isSuperAdmin() || role?.groupId !== 'APP_SUPER_ADMIN'
    );

  roleForm = this.fb.group({
    roleIds: this.fb.control<string[] | null>(null),
  });

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private referenceDataStore: ReferenceDataStore,
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    public dialogRef: MatDialogRef<AddUserRoleComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { userLoginId: string; selectedRoleIds: string[] }
  ) {}

  ngOnInit(): void {
    this.roleForm.patchValue({
      roleIds: this.data?.selectedRoleIds ?? null,
    });
    this.referenceDataStore.ensureRolesLoaded();
  }

  saveRoles(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const roleIds = this.roleForm.value.roleIds || [];

    this.userService
      .updateUser(this.data.userLoginId, { roleIds })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('USER.ROLES_UPDATE_SUCCESS'));
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('USER.ROLES_UPDATE_ERROR'));
        },
      });
  }
}
