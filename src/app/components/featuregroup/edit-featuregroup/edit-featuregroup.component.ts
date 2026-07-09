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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';

@Component({
  standalone: false,
  selector: 'app-edit-featuregroup',
  templateUrl: './edit-featuregroup.component.html',
  styleUrls: ['./edit-featuregroup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFeaturegroupComponent {
  featureGroupForm: FormGroup;
  readonly isLoading = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<EditFeaturegroupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { featureGroupDetail: any },
    private fb: FormBuilder,
    private featureGroupService: FeatureGroupService
  ) {
    const { productFeatureGroupId, description } =
      this.data?.featureGroupDetail ?? {};

    this.featureGroupForm = this.fb.group({
      productFeatureGroupId: [productFeatureGroupId],
      description: [description, Validators.required],
    });
  }

  updateFeature(): void {
    if (this.featureGroupForm.valid) {
      this.isLoading.set(true);
      const values = this.featureGroupForm.value;

      this.featureGroupService.updateFeatureGroup(values).pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          this.featureGroupForm.reset();
          this.dialogRef.close(values);
        },
        error: (_error) => {
        }
      });
    }
  }
}
