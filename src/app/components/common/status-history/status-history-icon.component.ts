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
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '../material/material.module';

export interface StatusHistoryEntry {
  statusId?: string | null;
  statusLabel?: string | null;
  changedAt?: string | null;
  changedBy?: string | null;
  reason?: string | null;
}

@Component({
  selector: 'app-status-history-icon',
  standalone: true,
  imports: [CommonModule, TranslateModule, MaterialModule],
  templateUrl: './status-history-icon.component.html',
  styleUrls: ['./status-history-icon.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusHistoryIconComponent {
  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  @Input() entries: StatusHistoryEntry[] | null = [];
  @Input() titleKey = 'COMMON.STATUS_HISTORY';
  isOpen = false;

  get hasEntries(): boolean {
    return Array.isArray(this.entries) && this.entries.length > 0;
  }

  get showReasonColumn(): boolean {
    return !!this.entries?.some((entry) => !!entry?.reason);
  }

  open(): void {
    if (this.hasEntries) {
      this.isOpen = true;
    }
  }

  close(): void {
    this.isOpen = false;
  }

  toggle(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.hasEntries) {
      return;
    }
    this.isOpen = !this.isOpen;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.close();
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
