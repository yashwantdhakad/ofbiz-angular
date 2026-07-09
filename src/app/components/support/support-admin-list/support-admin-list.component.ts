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
import { PageEvent } from '@angular/material/paginator';
import { SupportService } from '@ofbiz/services/support/support.service';
import { SupportTicket } from '@ofbiz/models/support.model';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-support-admin-list',
  standalone: false,
  templateUrl: './support-admin-list.component.html',
  styleUrls: ['./support-admin-list.component.css']
})
export class SupportAdminListComponent implements OnInit {
  displayedColumns: string[] = [
    'custRequestId', 'custRequestName', 'custRequestTypeName',
    'priority', 'statusId', 'fromPartyId', 'assignedToPartyId', 'createdDate'
  ];
  dataSource: SupportTicket[] = [];
  totalElements = 0;
  pageSize = 20;
  pageIndex = 0;
  loading = false;

  filterStatus = '';
  filterType = '';

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'CRQ_SUBMITTED', label: 'Submitted' },
    { value: 'CRQ_ACCEPTED', label: 'Accepted' },
    { value: 'CRQ_REVIEWED', label: 'Reviewed' },
    { value: 'CRQ_PENDING', label: 'Pending Customer' },
    { value: 'CRQ_COMPLETED', label: 'Completed' },
    { value: 'CRQ_REJECTED', label: 'Rejected' },
    { value: 'CRQ_CANCELLED', label: 'Cancelled' }
  ];

  typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'SUPPORT_BUG', label: 'Bug Report' },
    { value: 'SUPPORT_FEATURE', label: 'Feature Request' },
    { value: 'SUPPORT_FEEDBACK', label: 'Feedback' },
    { value: 'SUPPORT_OTHER', label: 'Other' }
  ];

  constructor(
    private supportService: SupportService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isSuperAdmin()) {
      this.router.navigate(['/support/tickets']);
      return;
    }
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.supportService.listAllTickets(
      this.filterStatus || undefined,
      this.filterType || undefined,
      this.pageIndex,
      this.pageSize
    ).subscribe({
      next: (res) => {
        this.dataSource = res.content || [];
        this.totalElements = res.totalElements || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter(): void {
    this.pageIndex = 0;
    this.loadTickets();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTickets();
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

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      'CRITICAL': 'priority-critical',
      'HIGH': 'priority-high',
      'MEDIUM': 'priority-medium',
      'LOW': 'priority-low'
    };
    return map[priority] || '';
  }
}
