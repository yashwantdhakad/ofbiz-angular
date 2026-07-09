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
import { ChangeDetectionStrategy, Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InvoiceService } from '@ofbiz/services/invoice/invoice.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

interface ReconcileItem {
  itemSeqId: string;
  description: string;
  poOrd: number;
  poRecv: number;
  poCost: number;
  poOffInv: number;
  poExtNet: number;
  invQty: number;
  invCost: number;
  invOffInv: number;
  invExtNet: number;
  extNetVar: number;
  qtyVar: number;
  editing: boolean;
}

@Component({
  standalone: false,
  selector: 'app-reconcile-invoice',
  templateUrl: './reconcile-invoice.component.html',
  styleUrls: ['./reconcile-invoice.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReconcileInvoiceComponent implements OnInit {
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  invoice = signal<any>(null);
  reconcileItems = signal<ReconcileItem[]>([]);
  statusMap = computed(() => this.referenceDataStore.statusDescriptionMap());
  statusHistoryEntries = computed<StatusHistoryEntry[]>(() => {
    const statuses = this.invoice()?.statusHistory || this.invoice()?.statuses;
    if (!Array.isArray(statuses)) {
      return [];
    }
    return statuses
      .filter((entry: any) => !!entry?.statusId)
      .map((entry: any) => ({
        statusId: entry.statusId,
        statusLabel: this.getStatusLabel(entry.statusId),
        changedAt: entry.statusDate,
        changedBy: entry.changeByUserLoginId,
      }));
  });

  displayedColumns: string[] = [
    'itemDesc', 'poOrd', 'poRecv', 'poCost', 'poOffInv', 'poExtNet',
    'invQty', 'invCost', 'invOffInv', 'invExtNet', 'extNetVar', 'qtyVar', 'actions'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private referenceDataStore: ReferenceDataStore
  ) {}

  ngOnInit(): void {
    this.referenceDataStore.ensureAllStatusesLoaded();
    const rawId = this.route.snapshot.paramMap.get('id');
    if (!rawId) return;
    this.loadInvoice(rawId);
  }

  loadInvoice(id: number | string): void {
    this.isLoading.set(true);
    this.invoiceService.getInvoiceDetail(id).subscribe({
      next: (data) => {
        this.invoice.set(data);
        this.buildReconcileItems(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  buildReconcileItems(invoiceData: any): void {
    const items = (invoiceData?.items || []).map((item: any) => {
      const qty = Number(item.quantity || 0);
      const cost = Number(item.unitAmount || 0);
      const ext = qty * cost;
      return {
        itemSeqId: item.invoiceItemSeqId,
        description: item.description || item.productId || item.invoiceItemSeqId,
        poOrd: qty,
        poRecv: qty,
        poCost: cost,
        poOffInv: 0,
        poExtNet: ext,
        invQty: qty,
        invCost: cost,
        invOffInv: 0,
        invExtNet: ext,
        extNetVar: 0,
        qtyVar: 0,
        editing: false,
      } as ReconcileItem;
    });
    this.reconcileItems.set(items);
  }

  startEdit(item: ReconcileItem): void {
    item.editing = true;
    this.reconcileItems.set([...this.reconcileItems()]);
  }

  saveRow(item: ReconcileItem): void {
    item.invExtNet = item.invQty * item.invCost;
    item.extNetVar = item.invExtNet - item.poExtNet;
    item.qtyVar = item.invQty - item.poOrd;
    item.editing = false;
    this.reconcileItems.set([...this.reconcileItems()]);
  }

  cancelEdit(item: ReconcileItem): void {
    item.editing = false;
    this.reconcileItems.set([...this.reconcileItems()]);
  }

  get totals() {
    const items = this.reconcileItems();
    return {
      poOrd: items.reduce((s, i) => s + i.poOrd, 0),
      poRecv: items.reduce((s, i) => s + i.poRecv, 0),
      poExtNet: items.reduce((s, i) => s + i.poExtNet, 0),
      invExtNet: items.reduce((s, i) => s + i.invExtNet, 0),
      extNetVar: items.reduce((s, i) => s + i.extNetVar, 0),
      qtyVar: items.reduce((s, i) => s + i.qtyVar, 0),
    };
  }

  get receiptTotal(): number {
    return this.reconcileItems().reduce((s, i) => s + i.poExtNet, 0);
  }

  get invoiceTotal(): number {
    return this.reconcileItems().reduce((s, i) => s + i.invExtNet, 0);
  }

  get amtDueVar(): number {
    return this.invoiceTotal - this.receiptTotal;
  }
  getStatusLabel(statusId?: string | null): string {
    if (!statusId) return '-';
    const normalized = String(statusId).trim();
    const map = this.statusMap();
    return map.get(normalized) || map.get(normalized.toUpperCase()) || this.humanizeCode(normalized);
  }

  private humanizeCode(code?: string): string {
    return String(code || '').split('_').filter(Boolean)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' ');
  }

  goBack(): void {
    const inv = this.invoice();
    if (inv?.id) {
      this.router.navigate(['/invoices/purchase', inv.id]);
    }
  }

  getPOReference(invoiceData: any): string {
    return (invoiceData?.references || []).map((r: any) => r.referenceId).join(', ') || '-';
  }
}
