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
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { UserService } from '@ofbiz/services/security/user.service';

@Component({
  standalone: false,
  selector: 'app-add-user-permission',
  templateUrl: './add-user-permission.component.html',
  styleUrls: ['./add-user-permission.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddUserPermissionComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly permissions = this.referenceDataStore.permissions;

  permissionForm = this.fb.group({
    permissionIds: this.fb.control<string[] | null>(null),
  });

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private referenceDataStore: ReferenceDataStore,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    public dialogRef: MatDialogRef<AddUserPermissionComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { userLoginId: string; selectedPermissionIds: string[]; selectedRoleIds?: string[] }
  ) {}

  ngOnInit(): void {
    this.referenceDataStore.ensurePermissionsLoaded();

    const initialPermissions = new Set<string>(this.data?.selectedPermissionIds ?? []);
    const selectedRoles = this.data?.selectedRoleIds ?? [];

    if (selectedRoles.length > 0) {
      this.isLoading.set(true);
      this.userService
        .listGroupPermissions()
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (groupPerms) => {
            const list = Array.isArray(groupPerms) ? groupPerms : [];
            list.forEach((item) => {
              if (item?.groupId && selectedRoles.includes(item.groupId) && item.permissionId) {
                initialPermissions.add(item.permissionId);
              }
            });
            this.permissionForm.patchValue({
              permissionIds: Array.from(initialPermissions),
            });
          },
          error: () => {
            this.permissionForm.patchValue({
              permissionIds: Array.from(initialPermissions),
            });
          },
        });
    } else {
      this.permissionForm.patchValue({
        permissionIds: Array.from(initialPermissions),
      });
    }
  }

  savePermissions(): void {
    if (this.permissionForm.invalid) {
      this.permissionForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const permissionIds = this.permissionForm.value.permissionIds || [];

    this.userService
      .updateUser(this.data.userLoginId, { permissionIds })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('USER.PERMISSIONS_UPDATE_SUCCESS'));
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('USER.PERMISSIONS_UPDATE_ERROR'));
        },
      });
  }
}
