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
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { SupportService } from '@ofbiz/services/support/support.service';
import { SupportTicket } from '@ofbiz/models/support.model';
import { AuthService } from '@ofbiz/services/common/auth.service';

@Component({
  selector: 'app-support-list',
  standalone: false,
  templateUrl: './support-list.component.html',
  styleUrls: ['./support-list.component.css']
})
export class SupportListComponent implements OnInit {
  displayedColumns: string[] = ['custRequestId', 'custRequestName', 'custRequestTypeName', 'priority', 'statusId', 'createdDate'];
  dataSource: SupportTicket[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  loading = false;
  isAdmin = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private supportService: SupportService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isSuperAdmin();
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.supportService.listMyTickets(this.pageIndex, this.pageSize).subscribe({
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

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTickets();
  }

  getStatusClass(statusId: string): string {
    switch (statusId) {
      case 'CRQ_SUBMITTED':
        return 'status-submitted';
      case 'CRQ_ACCEPTED':
      case 'CRQ_REVIEWED':
        return 'status-active';
      case 'CRQ_COMPLETED':
        return 'status-completed';
      case 'CRQ_REJECTED':
      case 'CRQ_CANCELLED':
        return 'status-cancelled';
      case 'CRQ_PENDING':
        return 'status-pending';
      default:
        return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'priority-critical';
      case 'HIGH':
        return 'priority-high';
      case 'MEDIUM':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  }
}
