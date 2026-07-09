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
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { UserCreatePayload, UserDetailResponse } from '@ofbiz/models/user.model';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { UserService } from '@ofbiz/services/security/user.service';

@Component({
  standalone: false,
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUserComponent {
  readonly isLoading = signal(false);
  userForm = this.fb.group({
    userLoginId: ['', Validators.required],
    password: ['', Validators.required],
    firstName: [''],
    lastName: [''],
    enabled: [true, Validators.required],
    requirePasswordChange: [false],
  });

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackbarService: SnackbarService,
    private router: Router,
    private translate: TranslateService
  ) {}
  createUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.userService
      .createUser(this.userForm.value as UserCreatePayload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: UserDetailResponse) => {
          const createdId = response?.userDetail?.user?.userLoginId || this.userForm.value.userLoginId;
          this.snackbarService.showSuccess(this.translate.instant('USER.CREATE_SUCCESS'));
          this.userForm.reset({
            enabled: true,
            requirePasswordChange: false,
          });
          if (createdId) {
            this.router.navigate(['/users', createdId]);
          }
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('USER.CREATE_ERROR'));
        },
      });
  }
}
