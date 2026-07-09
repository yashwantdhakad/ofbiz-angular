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
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { AppShellMaterialModule } from '../../common/material/app-shell-material.module';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, AppShellMaterialModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  form: FormGroup;
  readonly isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackbar: SnackbarService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.form = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentPassword = this.form.get('currentPassword')?.value ?? '';
    const newPassword = this.form.get('newPassword')?.value ?? '';
    const confirmPassword = this.form.get('confirmPassword')?.value ?? '';
    if (newPassword !== confirmPassword) {
      this.snackbar.showError(this.translate.instant('CHANGE_PASSWORD.MISMATCH_ERROR'));
      return;
    }

    this.isLoading.set(true);
    this.authService.changePassword(currentPassword, newPassword)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.authService.setRequirePasswordChange(false);
          this.snackbar.showSuccess(this.translate.instant('CHANGE_PASSWORD.SUCCESS'));
          this.router.navigateByUrl('/home');
        },
        error: (error) => {
          const message =
            error?.error?.detail || error?.error?.message || this.translate.instant('CHANGE_PASSWORD.ERROR');
          this.snackbar.showError(message);
        },
      });
  }
}
