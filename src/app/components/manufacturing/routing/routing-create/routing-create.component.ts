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
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ManufacturingService } from '../../../../services/manufacturing/manufacturing.service';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: false,
  selector: 'app-routing-create',
  templateUrl: './routing-create.component.html',
  styleUrls: ['./routing-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutingCreateComponent implements OnInit {
  routingForm!: FormGroup;
  readonly isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private manufacturingService: ManufacturingService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.routingForm = this.fb.group({
      workEffortName: ['', [Validators.required]],
      description: [''],
      quantityToProduce: [0, [Validators.min(0)]]
    });
  }

  createRouting(): void {
    if (this.routingForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.routingForm.value;

    const payload = {
      workEffortTypeId: 'ROUTING',
      currentStatusId: 'ROU_ACTIVE',
      workEffortName: formValue.workEffortName,
      description: formValue.description,
      quantityToProduce: formValue.quantityToProduce || 0,
      revisionNumber: 1
    };

    this.manufacturingService.createRouting(payload).subscribe({
      next: (response) => {
        this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.CREATE_ROUTING_SUCCESS'));

        // Navigate to the detail page of the created routing
        const result = response as { workEffortId?: string };
        if (result?.workEffortId) {
          this.router.navigate(['/routings', result.workEffortId]);
        } else {
          this.router.navigate(['/routings']);
        }
      },
      error: (error) => {
        console.error('Error creating routing:', error);
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.CREATE_ROUTING_ERROR'));
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/routings']);
  }
}
