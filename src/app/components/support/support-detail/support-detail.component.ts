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
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupportService } from '@ofbiz/services/support/support.service';
import { SupportTicket } from '@ofbiz/models/support.model';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { AuthService } from '@ofbiz/services/common/auth.service';

@Component({
  selector: 'app-support-detail',
  standalone: false,
  templateUrl: './support-detail.component.html',
  styleUrls: ['./support-detail.component.css']
})
export class SupportDetailComponent implements OnInit {
  ticket: SupportTicket | null = null;
  loading = false;
  isAdmin = false;
  saving = false;

  statusForm!: FormGroup;
  assignForm!: FormGroup;
  commentForm!: FormGroup;

  statusOptions = [
    { value: 'CRQ_SUBMITTED',  label: 'Submitted' },
    { value: 'CRQ_ACCEPTED',   label: 'Accepted' },
    { value: 'CRQ_REVIEWED',   label: 'Reviewed' },
    { value: 'CRQ_PENDING',    label: 'Pending Customer' },
    { value: 'CRQ_COMPLETED',  label: 'Completed' },
    { value: 'CRQ_REJECTED',   label: 'Rejected' },
    { value: 'CRQ_CANCELLED',  label: 'Cancelled' }
  ];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private supportService: SupportService,
    private snackbarService: SnackbarService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isSuperAdmin();
    this.initForms();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTicket(id);
    }
  }

  private initForms(): void {
    this.statusForm = this.fb.group({
      statusId: ['', Validators.required],
      resolutionNote: ['']
    });
    this.assignForm = this.fb.group({
      assigneeLoginId: ['', Validators.required]
    });
    this.commentForm = this.fb.group({
      commentText: ['', Validators.required]
    });
  }

  loadTicket(id: string): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.supportService.getTicket(id).subscribe({
      next: (t) => {
        this.ticket = t;
        this.statusForm.patchValue({ statusId: t.statusId });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onUpdateStatus(): void {
    if (!this.ticket || this.statusForm.invalid) return;
    this.saving = true;
    this.supportService.updateStatus(this.ticket.custRequestId, this.statusForm.value).subscribe({
      next: (t) => {
        this.ticket = t;
        this.snackbarService.showSuccess('Status updated successfully.');
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackbarService.showError(err?.error?.message || 'Failed to update status.');
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAssign(): void {
    if (!this.ticket || this.assignForm.invalid) return;
    this.saving = true;
    this.supportService.assignTicket(this.ticket.custRequestId, this.assignForm.value).subscribe({
      next: (t) => {
        this.ticket = t;
        this.snackbarService.showSuccess('Ticket assigned successfully.');
        this.assignForm.reset();
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackbarService.showError(err?.error?.message || 'Failed to assign ticket.');
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAddComment(): void {
    if (!this.ticket || this.commentForm.invalid) return;
    this.saving = true;
    this.supportService.addComment(this.ticket.custRequestId, this.commentForm.value).subscribe({
      next: (t) => {
        this.ticket = t;
        this.commentForm.reset();
        this.snackbarService.showSuccess('Comment added.');
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackbarService.showError(err?.error?.message || 'Failed to add comment.');
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusClass(statusId: string): string {
    const map: Record<string, string> = {
      'CRQ_SUBMITTED': 'status-submitted',
      'CRQ_ACCEPTED': 'status-active',
      'CRQ_REVIEWED': 'status-active',
      'CRQ_COMPLETED': 'status-completed',
      'CRQ_REJECTED': 'status-cancelled',
      'CRQ_CANCELLED': 'status-cancelled',
      'CRQ_PENDING': 'status-pending'
    };
    return map[statusId] || '';
  }
}
