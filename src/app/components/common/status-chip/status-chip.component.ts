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
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * StatusChipComponent — renders a colour-coded badge for any status string.
 *
 * Usage:
 *   <app-status-chip [status]="item.statusDescription" [statusId]="item.statusId"></app-status-chip>
 *
 * Color mapping is driven by the raw statusId key so it works independent of locale/translation.
 */
@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-chip.component.html',
  styleUrls: ['./status-chip.component.css']
})
export class StatusChipComponent {
  /** Human-readable label to display in the chip (may be translated). */
  @Input() status: string = '';

  /** Raw status ID used for colour mapping (e.g. "ORDER_APPROVED"). */
  @Input() statusId: string = '';

  get colorClass(): string {
    const id = (this.statusId || '').toUpperCase();
    if (!id) return 'chip--neutral';

    // Success / active / completed
    if (/(APPROVED|ACTIVE|COMPLETE|COMPLETED|PICKED|RECEIVED|PAID|DELIVERED|CONFIRMED|ACCEPTED|ENABLED)/.test(id)) {
      return 'chip--success';
    }
    // Pending / in-progress / open
    if (/(PENDING|CREATED|OPEN|NEW|DRAFT|PROCESSING|IN_PROGRESS|SENT|PLACED|SUBMITTED|REVIEW|WAITING)/.test(id)) {
      return 'chip--pending';
    }
    // Warning / on-hold / partial
    if (/(HOLD|PARTIAL|BACKORDER|WARN|ALERT|PAUSED|SUSPENDED)/.test(id)) {
      return 'chip--warning';
    }
    // Error / cancelled / rejected / inactive
    if (/(CANCEL|REJECT|FAIL|ERROR|INACTIVE|DISABLED|CLOSED|VOID|LOST|EXPIRED)/.test(id)) {
      return 'chip--error';
    }

    return 'chip--neutral';
  }
}
