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
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
    selector: 'app-variance-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        FlexLayoutModule,
        MatCardModule,
        TranslateModule
    ],
    templateUrl: './variance-dialog.component.html',
    styleUrls: ['./variance-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VarianceDialogComponent implements OnInit {
    isLoading = signal<boolean>(false);
    reasons = signal<any[]>([]);
    varianceForm: FormGroup;

    constructor(
        public dialogRef: MatDialogRef<VarianceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { assetId: string },
        private assetService: AssetService,
        private snackbarService: SnackbarService,
        private fb: FormBuilder,
        private renderScheduler: RenderSchedulerService,
        private translate: TranslateService
    ) {
        this.varianceForm = this.fb.group({
            varianceReasonId: ['', Validators.required],
            quantityOnHandVar: [0],
            availableToPromiseVar: [0],
            comments: ['']
        });
    }

    ngOnInit(): void {
        this.assetService.getVarianceReasons().subscribe({
            next: (data: any[]) => {
                this.renderScheduler.deferMacrotask(() => {
                    this.reasons.set(
                        data.map((r: any) => ({
                            varianceReasonId: r.varianceReasonId,
                            description: r.description || r.varianceReasonId,
                        }))
                    );
                });
            },
            error: () => {
                this.renderScheduler.deferMacrotask(() => {
                    this.reasons.set([]);
                });
            }
        });
    }

    save(): void {
        if (this.varianceForm.invalid) {
            this.varianceForm.markAllAsTouched();
            return;
        }

        this.renderScheduler.deferMacrotask(() => {
            this.isLoading.set(true);
        });
        const varianceData = this.varianceForm.value;

        this.assetService.createPhysicalInventoryVariance(this.data.assetId, varianceData)
            .pipe(finalize(() => {
                this.renderScheduler.deferMacrotask(() => {
                    this.isLoading.set(false);
                });
            }))
            .subscribe({
                next: (response) => {
                    this.snackbarService.showSuccess(this.translate.instant('ASSET.VARIANCE.SUCCESS'));
                    const createdVariance = {
                        ...(response?.variance || response || {}),
                        ...varianceData,
                        varianceReasonId: varianceData.varianceReasonId,
                        comments: varianceData.comments,
                        quantityOnHandVar: varianceData.quantityOnHandVar,
                        availableToPromiseVar: varianceData.availableToPromiseVar,
                    };
                    this.dialogRef.close({ created: true, variance: createdVariance });
                },
                error: () => {
                    this.snackbarService.showError(this.translate.instant('ASSET.VARIANCE.ERROR'));
                }
            });
    }

    cancel(): void {
        this.dialogRef.close(false);
    }

    trackByReason = (index: number, reason: any): string =>
        reason?.varianceReasonId ?? String(index);
}
