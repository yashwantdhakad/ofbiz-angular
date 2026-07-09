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
    selector: 'app-add-product-facility-location-dialog',
    templateUrl: './add-product-facility-location-dialog.component.html',
    styleUrls: ['./add-product-facility-location-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProductFacilityLocationDialogComponent implements OnInit {
    form: FormGroup;
    locations: any[] = [];
    readonly isLoading = signal(false);

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<AddProductFacilityLocationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { productId: string, facilityId: string, facilityName: string, productFacilityLocation?: any },
        private facilityService: FacilityService,
        private productFacilityService: ProductFacilityService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private destroyRef: DestroyRef,
        private cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            locationSeqId: [data.productFacilityLocation?.locationSeqId || '', Validators.required],
            minimumStock: [data.productFacilityLocation?.minimumStock || ''],
            moveQuantity: [data.productFacilityLocation?.moveQuantity || ''],
            reorderQuantity: [data.productFacilityLocation?.reorderQuantity || ''],
            maximumStock: [data.productFacilityLocation?.maximumStock || '']
        });
    }

    ngOnInit(): void {
        this.loadLocations();
    }

    loadLocations(): void {
        // We want all locations, so we pass a large page size
        // Note: This API might return a Page object or a List. 
        // Assuming standard pagination response structure if paginated.
        this.facilityService.getFacilityLocations(this.data.facilityId, 0, 1000).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (response) => {
                if (response && response.content) {
                    this.locations = response.content;
                } else if (Array.isArray(response)) {
                    this.locations = response;
                } else {
                    this.locations = [];
                }
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
            productId: this.data.productId,
            facilityId: this.data.facilityId
        };

        const request = this.data.productFacilityLocation
            ? this.productFacilityService.updateProductFacilityLocation(this.data.productFacilityLocation.id, payload)
            : this.productFacilityService.createProductFacilityLocation(payload);

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
