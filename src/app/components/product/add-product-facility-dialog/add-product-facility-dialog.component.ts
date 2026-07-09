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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { ProductFacilityService } from '@ofbiz/services/product/product-facility.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
    standalone: false,
    selector: 'app-add-product-facility-dialog',
    templateUrl: './add-product-facility-dialog.component.html',
    styleUrls: ['./add-product-facility-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProductFacilityDialogComponent implements OnInit {
    form: FormGroup;
    facilities: any[] = [];
    readonly isLoading = signal(false);

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<AddProductFacilityDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { productId: string, productFacility?: any },
        private facilityService: FacilityService,
        private productFacilityService: ProductFacilityService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private destroyRef: DestroyRef,
        private cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            facilityId: [data.productFacility?.facilityId || '', Validators.required],
            minimumStock: [data.productFacility?.minimumStock || '', Validators.required],
            reorderQuantity: [data.productFacility?.reorderQuantity || '', Validators.required],
            daysToShip: [data.productFacility?.daysToShip || '']
        });
    }

    ngOnInit(): void {
        this.loadFacilities();
    }

    loadFacilities(): void {
        this.facilityService.getFacilities().pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (data) => {
                this.facilities = Array.isArray(data) ? data : [];
                this.cdr.markForCheck();
            },
            error: () => {
                this.snackbar.showError(this.translate.instant('COMMON.ERROR_LOADING_DATA'));
                this.cdr.markForCheck();
            }
        });
    }

    save(): void {
        if (this.form.invalid) return;

        this.isLoading.set(true);
        const payload = {
            ...this.form.value,
            productId: this.data.productId
        };

        const request = this.data.productFacility
            ? this.productFacilityService.updateProductFacility(this.data.productFacility.id, payload)
            : this.productFacilityService.createProductFacility(payload);

        request.pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.isLoading.set(false))
        ).subscribe({
            next: (res) => {
                this.dialogRef.close(res);
                this.snackbar.showSuccess(this.translate.instant('COMMON.SAVE_SUCCESS'));
            },
            error: () => {
                this.snackbar.showError(this.translate.instant('COMMON.SAVE_ERROR'));
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }
}
