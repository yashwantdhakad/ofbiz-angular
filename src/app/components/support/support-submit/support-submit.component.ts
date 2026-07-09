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
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupportService } from '@ofbiz/services/support/support.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  selector: 'app-support-submit',
  standalone: false,
  templateUrl: './support-submit.component.html',
  styleUrls: ['./support-submit.component.css']
})
export class SupportSubmitComponent implements OnInit {
  ticketForm!: FormGroup;
  submitting = false;

  ticketTypes = [
    { value: 'SUPPORT_BUG', label: 'Bug Report' },
    { value: 'SUPPORT_FEATURE', label: 'Feature Request' },
    { value: 'SUPPORT_FEEDBACK', label: 'Feedback' },
    { value: 'SUPPORT_OTHER', label: 'Other Support' }
  ];

  priorities = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];

  constructor(
    private fb: FormBuilder,
    private supportService: SupportService,
    private snackbarService: SnackbarService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.ticketForm = this.fb.group({
      subject: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required]],
      custRequestTypeId: ['SUPPORT_BUG', [Validators.required]],
      priority: ['MEDIUM', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      return;
    }
    this.submitting = true;
    this.supportService.createTicket(this.ticketForm.value).subscribe({
      next: () => {
        this.snackbarService.showSuccess('Support ticket submitted successfully!');
        this.router.navigate(['/support/tickets']);
      },
      error: (err) => {
        this.submitting = false;
        this.snackbarService.showError(err.error?.message || 'Failed to submit support ticket.');
      }
    });
  }
}
