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
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { AppShellMaterialModule } from '../common/material/app-shell-material.module';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { NavigationService } from '@ofbiz/services/common/navigation.service';
import { TokenStorageService } from '@ofbiz/services/common/token-storage.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, AppShellMaterialModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  readonly isLoading = signal(false);
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private navigationService: NavigationService,
    private tokenStorage: TokenStorageService,
    private snackbar: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.tokenStorage.clearToken(); // Clear stale token if any
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    const { username, password } = this.loginForm.value;

    this.authService
      .login(username, password)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          const requirePasswordChange = this.authService.storeLoginSession(response);

          if (requirePasswordChange) {
            this.router.navigateByUrl('/change-password');
            return;
          }

          const redirectUrl = this.navigationService.getLastUrl();
          const targetUrl =
            redirectUrl && redirectUrl !== '/login' ? redirectUrl : '/home';

          this.navigationService.clearLastUrl();
          this.router.navigateByUrl(targetUrl);
        },
        error: (err) => {
          const message =
            err?.error?.detail ||
            err?.error?.message ||
            this.translate.instant('LOGIN_ERROR');
          this.snackbar.showError(message);
          this.loginForm.get('password')?.reset();
        },
      });
  }
}
