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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
  standalone: false,
  selector: 'app-produce-item',
  templateUrl: './produce-item.component.html',
  styleUrls: ['./produce-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProduceItemComponent implements OnInit {
  produceForm: FormGroup;
  facilityLocations: any[] = [];
  readonly isLoading = signal(false);
  facilityId: string | undefined;
  productLabel = '';
  estimatedQuantity = 0;
  producedQuantity = 0;
  remainingQuantity = 0;

  totalJobCost = 0;

  constructor(
    public dialogRef: MatDialogRef<ProduceItemComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { produceData: any },
    private fb: FormBuilder,
    private facilityService: FacilityService,
    private manufacturingService: ManufacturingService,
    private renderScheduler: RenderSchedulerService
  ) {
    const { workEffortId, productId, productName, facilityId, estimatedQuantity, producedQuantity, remainingQuantity, totalJobCost } =
      this.data?.produceData ?? {};
    this.totalJobCost = this.toNumber(totalJobCost);

    this.facilityId = facilityId;
    this.productLabel = productName ? `${productName} (${productId})` : productId;
    this.estimatedQuantity = this.toNumber(estimatedQuantity);
    this.producedQuantity = this.toNumber(producedQuantity);
    this.remainingQuantity = Math.max(this.toNumber(remainingQuantity), 0);

    const defaultQuantity = this.remainingQuantity > 0 ? this.remainingQuantity : 1;
    const quantityValidators = [Validators.required, Validators.min(1)];
    if (this.remainingQuantity > 0) {
      quantityValidators.push(Validators.max(this.remainingQuantity));
    }

    this.produceForm = this.fb.group({
      workEffortId: [workEffortId],
      productId: [productId, Validators.required],
      quantity: [String(defaultQuantity), quantityValidators],
      quantityScrapped: ['0', [Validators.min(0)]],
      locationSeqId: ['', Validators.required],
      lotId: [''],
      containerId: [''],
    });
  }

  ngOnInit(): void {
    this.renderScheduler.deferMacrotask(() => {
      this.loadFacilityLocations();
    });
  }

  private loadFacilityLocations(): void {
    if (!this.facilityId) {
      this.facilityLocations = [];
      return;
    }
    this.facilityService.getFacilityLocations(this.facilityId, 0, 1000).subscribe({
      next: (data) => {
        const locations = Array.isArray(data?.content) ? data.content : [];
        this.renderScheduler.deferMacrotask(() => {
          this.facilityLocations = locations;
        });
      },
      error: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.facilityLocations = [];
        });
      },
    });
  }

  produce(): void {
    if (this.produceForm.invalid) {
      this.produceForm.markAllAsTouched();
      return;
    }

    const values = this.produceForm.value;

    const goodQty = Number(values.quantity || 0);
    const scrapQty = Number(values.quantityScrapped || 0);
    if (this.remainingQuantity > 0 && goodQty + scrapQty > this.remainingQuantity) {
      this.produceForm.get('quantityScrapped')?.setErrors({ exceedsRemaining: true });
      this.produceForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const payload: Record<string, unknown> = {
      productId: values.productId,
      quantity: values.quantity,
      locationSeqId: values.locationSeqId,
      lotId: values.lotId,
      containerId: values.containerId,
    };
    if (scrapQty > 0) {
      payload['quantityScrapped'] = values.quantityScrapped;
    }

    this.manufacturingService
      .produceItem(values.workEffortId, payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.dialogRef.close(response);
          this.produceForm.reset({
            workEffortId: values.workEffortId,
            productId: values.productId,
            quantity: String(this.remainingQuantity > 0 ? this.remainingQuantity : 1),
            locationSeqId: '',
            lotId: '',
            containerId: '',
          });
        },
        error: () => {
        },
      });
  }

  private toNumber(value: any): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  trackByLocation = (index: number, location: any): string =>
    location?.locationSeqId ?? String(index);
}
