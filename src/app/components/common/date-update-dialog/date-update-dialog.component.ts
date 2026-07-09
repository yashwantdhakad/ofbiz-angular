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
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AppShellMaterialModule } from '../material/app-shell-material.module';
import { AuthService } from '@ofbiz/services/common/auth.service';

@Component({
    standalone: true,
    selector: 'app-date-update-dialog',
    imports: [CommonModule, ReactiveFormsModule, TranslateModule, AppShellMaterialModule],
    templateUrl: './date-update-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
    .full-width {
      width: 100%;
    }
  `]
})
export class DateUpdateDialogComponent {
    dateControl: FormControl;
    title: string;
    timeZone: string;

    constructor(
        public dialogRef: MatDialogRef<DateUpdateDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { title: string, date: Date | string, timeZone?: string },
        private authService: AuthService
    ) {
        this.title = data.title || 'Update Date';
        this.dateControl = new FormControl(data.date ? new Date(data.date) : null);
        this.timeZone = data.timeZone || this.resolveCurrentTimeZone();
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        this.dialogRef.close(this.dateControl.value);
    }

    get previewDate(): string {
        const value = this.dateControl.value;
        if (!value) {
            return '-';
        }
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }
        return new Intl.DateTimeFormat(undefined, {
            timeZone: this.timeZone,
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }).format(date);
    }

    private resolveCurrentTimeZone(): string {
        const userLoginId = this.authService.getUserLoginId();
        const scopedKey = userLoginId ? `user_pref:${userLoginId}:timezone` : 'timezone';
        const stored = localStorage.getItem(scopedKey) || localStorage.getItem('timezone');
        if (stored && stored.trim().length > 0) {
            return stored.trim();
        }
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
}
