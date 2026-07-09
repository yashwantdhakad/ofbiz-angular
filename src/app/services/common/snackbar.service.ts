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
import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private defaultConfig: MatSnackBarConfig = {
    duration: 2000,
    horizontalPosition: 'center',
    verticalPosition: 'top',
  };
  private errorConfig: MatSnackBarConfig = {
    horizontalPosition: 'center',
    verticalPosition: 'top',
  };

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Shows a success message in a snack bar.
   * @param message - The message to display.
   * @param config - Optional custom configuration for the snack bar.
   */
  showSuccess(message: string, config?: MatSnackBarConfig): void {
    this.showMessage(message, { ...this.defaultConfig, panelClass: ['success-snackbar'], ...config });
  }

  /**
   * Shows an error message in a snack bar.
   * @param message - The message to display.
   * @param config - Optional custom configuration for the snack bar.
   */
  showError(message: string, config?: MatSnackBarConfig): void {
    this.showMessage(message, { ...this.errorConfig, panelClass: ['error-snackbar'], ...config });
  }

  /**
   * Shows a message in a snack bar with custom configuration.
   * @param message - The message to display.
   * @param config - Custom configuration for the snack bar.
   */
  private showMessage(message: string, config: MatSnackBarConfig): void {
    this.snackBar.open(message, 'Close', config);
  }
}
