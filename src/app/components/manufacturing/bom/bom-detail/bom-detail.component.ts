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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { BomAddComponentDialogComponent } from '../bom-add-component-dialog/bom-add-component-dialog.component';
import { ConfirmationDialogComponent } from '../../../common/confirmation-dialog/confirmation-dialog.component';
import { TranslateService } from '@ngx-translate/core';

interface BomApiComponent {
  assocId?: number;
  id?: number;
  productId?: string;
  parentProductId?: string;
  productIdTo?: string;
  productAssocTypeId?: string;
  productName?: string;
  internalName?: string;
  assocTypeId?: string;
  assocTypeLabel?: string;
  sequenceNum?: string | number;
  quantity?: string | number;
  fromDate?: string;
  thruDate?: string;
  scrapFactor?: string | number;
  instruction?: string;
}

interface BomDetailApiResponse {
  productId?: string;
  productName?: string;
  internalName?: string;
  bomTypeId?: string;
  bomTypeLabel?: string;
  revisionNumber?: string;
  revisionStatus?: string;
  revisionUpdatedAt?: string;
  revisionNote?: string;
  components?: BomApiComponent[];
  documents?: BomDocumentRecord[];
}

interface BomDocumentRecord {
  contentId?: string;
  description?: string;
  productContentTypeEnumId?: string;
  contentLocation?: string;
}

interface BomComponent {
  assocId?: number;
  seq: number;
  componentId?: string;
  parentProductId?: string;
  productIdTo?: string;
  componentName?: string;
  componentInternalName?: string;
  assocTypeId?: string;
  assocTypeLabel?: string;
  sequenceNum?: string | number;
  quantity?: string | number;
  fromDate?: string;
  thruDate?: string;
  scrap?: string | number;
  inst?: string;
}

@Component({
  standalone: false,
  selector: 'app-bom-detail',
  templateUrl: './bom-detail.component.html',
  styleUrls: ['./bom-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BomDetailComponent implements OnInit {
  private static readonly MAX_SIMULATION_DEPTH = 25;
  readonly isLoading = signal(true);
  productId = '';
  productName = '';
  productInternalName = '';
  bomTypeLabel = '';
  bomTypeId = '';
  revisionNumber = '';
  revisionStatus = '';
  revisionUpdatedAt = '';
  revisionNote = '';
  components: BomComponent[] = [];
  documents: BomDocumentRecord[] = [];
  simulationLoading = false;
  simulationTree: BomSimulationNode[] = [];
  simulationError = '';
  expandedNodeKeys = new Set<string>();
  private simulationSeq = 0;
  private readonly bomDetailCache = new Map<string, BomDetailApiResponse | null>();
  private readonly destroyRef = inject(DestroyRef);

  componentColumns = [
    'seq',
    'component',
    'assocType',
    'sequenceNum',
    'quantity',
    'fromDate',
    'thruDate',
    'scrap',
    'inst',
    'action',
  ];

  constructor(
    private route: ActivatedRoute,
    private manufacturingService: ManufacturingService,
    private dialog: MatDialog,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('productId') || ''),
        filter((productId) => !!productId),
        distinctUntilChanged(),
        tap((productId) => (this.productId = productId)),
        switchMap((productId) =>
          this.loadBom(productId).pipe(
            catchError((_error) => {
              return of(void 0);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  toggleSimulationNode(node: BomSimulationNode): void {
    if (!node?.children?.length) {
      return;
    }
    if (this.expandedNodeKeys.has(node.key)) {
      this.expandedNodeKeys.delete(node.key);
    } else {
      this.expandedNodeKeys.add(node.key);
    }
  }

  isExpanded(node: BomSimulationNode): boolean {
    return this.expandedNodeKeys.has(node.key);
  }

  expandAllSimulation(): void {
    this.expandedNodeKeys = new Set(this.collectExpandableNodeKeys(this.simulationTree));
  }

  collapseAllSimulation(): void {
    this.expandedNodeKeys.clear();
  }

  trackSimulationNode(_index: number, node: BomSimulationNode): string {
    return node.key;
  }

  loadBom(productId: string, showLoader: boolean = true): Observable<void> {
    if (!productId) {
      return of(void 0);
    }
    if (showLoader) {
      this.isLoading.set(true);
    }
    return this.manufacturingService.getBomDetail(productId).pipe(
      tap((response: BomDetailApiResponse) => {
        this.bomDetailCache.set(productId, response);
        this.productId = response?.productId || productId;
        this.productName = response?.productName || this.productId;
        this.productInternalName = response?.internalName || '';
        this.bomTypeId = response?.bomTypeId || '';
        this.bomTypeLabel = response?.bomTypeLabel || '';
        this.revisionNumber = response?.revisionNumber || '';
        this.revisionStatus = response?.revisionStatus || '';
        this.revisionUpdatedAt = response?.revisionUpdatedAt || '';
        this.revisionNote = response?.revisionNote || '';
        this.documents = Array.isArray(response?.documents) ? response.documents : [];

        const components = Array.isArray(response?.components) ? response.components : [];
        this.components = components.map((component: BomApiComponent, index: number) => ({
          assocId: component?.assocId ?? component?.id,
          seq: index + 1,
          componentId: component?.productId,
          parentProductId: component?.parentProductId || response?.productId || productId,
          productIdTo: component?.productIdTo || component?.productId,
          componentName: component?.productName || component?.productId,
          componentInternalName: component?.internalName || '',
          assocTypeId: component?.assocTypeId,
          assocTypeLabel: component?.assocTypeLabel || component?.assocTypeId,
          sequenceNum: component?.sequenceNum,
          quantity: component?.quantity || '-',
          fromDate: component?.fromDate,
          thruDate: component?.thruDate,
          scrap: component?.scrapFactor || '-',
          inst: component?.instruction || '-',
        }));
        this.startSimulationBuild(this.productId);
        this.cdr.markForCheck();
      }),
      map(() => void 0),
      finalize(() => {
        if (showLoader) {
          this.isLoading.set(false);
        }
      })
    );
  }

  openAddComponentDialog(): void {
    if (!this.productId) {
      return;
    }
    this.dialog
      .open(BomAddComponentDialogComponent, {
        width: '520px',
        data: {
          productId: this.productId,
          bomTypeId: this.bomTypeId,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) {
          this.reloadBom();
        }
      });
  }

  openEditComponentDialog(item: BomComponent): void {
    if (!this.productId || !item?.assocId) {
      return;
    }
    this.dialog
      .open(BomAddComponentDialogComponent, {
        width: '520px',
        data: {
          productId: this.productId,
          bomTypeId: this.bomTypeId,
          mode: 'edit',
          assocId: item.assocId,
          componentProductId: item.componentId,
          quantity: item.quantity,
          sequenceNum: item.sequenceNum,
          fromDate: item.fromDate,
          scrapFactor: item.scrap,
          instruction: item.inst === '-' ? '' : item.inst,
          parentProductId: item.parentProductId || this.productId,
          productIdTo: item.productIdTo || item.componentId,
          productAssocTypeId: item.assocTypeId || this.bomTypeId,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) {
          this.reloadBom();
        }
      });
  }

  confirmDeleteComponent(item: BomComponent): void {
    if (!item?.assocId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        title: this.translate.instant('BOM.CONFIRM_DELETE_TITLE'),
        message: this.translate.instant('BOM.CONFIRM_DELETE_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.manufacturingService.expireProductAssoc(item.assocId!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => this.reloadBom(),
        error: (error) => {
          console.error('[BOM Detail] expire failed', error);
        },
      });
    });
  }

  uploadDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.productId) {
      return;
    }
    const formData = new FormData();
    formData.append('uploadedFile', file);
    formData.append('description', file.name);
    this.manufacturingService.addBomDocument(this.productId, formData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.reloadBom(),
      error: (error) => {
        console.error('[BOM Detail] document upload failed', error);
      },
    });
  }

  openDocument(document: BomDocumentRecord): void {
    if (!this.productId || !document?.contentId) {
      return;
    }
    this.manufacturingService.downloadBomDocument(this.productId, document.contentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: (error) => {
        console.error('[BOM Detail] document download failed', error);
      },
    });
  }

  private reloadBom(): void {
    this.loadBom(this.productId, false)
      .pipe(
        catchError((error) => {
          console.error('[BOM Detail] reload failed', error);
          return of(void 0);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private startSimulationBuild(rootProductId: string): void {
    if (!rootProductId) {
      this.simulationTree = [];
      this.simulationError = '';
      this.simulationLoading = false;
      this.cdr.markForCheck();
      return;
    }

    const currentSeq = ++this.simulationSeq;
    this.simulationLoading = true;
    this.simulationError = '';
    this.expandedNodeKeys.clear();
    this.cdr.markForCheck();

    this.buildSimulationTree(rootProductId, currentSeq)
      .then((tree) => {
        if (currentSeq !== this.simulationSeq) {
          return;
        }
        this.simulationTree = tree;
        this.expandedNodeKeys = new Set(this.collectExpandableNodeKeys(tree));
        this.cdr.markForCheck();
      })
      .catch(() => {
        if (currentSeq !== this.simulationSeq) {
          return;
        }
        this.simulationTree = [];
        this.simulationError = 'Unable to build BOM simulation.';
        this.cdr.markForCheck();
      })
      .finally(() => {
        if (currentSeq !== this.simulationSeq) {
          return;
        }
        this.simulationLoading = false;
        this.cdr.markForCheck();
      });
  }

  private async buildSimulationTree(rootProductId: string, requestSeq: number): Promise<BomSimulationNode[]> {
    const root = await this.buildSimulationNode(rootProductId, 0, `root:${rootProductId}`, new Set(), requestSeq, '-');
    return root ? [root] : [];
  }

  private async buildSimulationNode(
    productId: string,
    level: number,
    key: string,
    path: Set<string>,
    requestSeq: number,
    quantityFromParent: string
  ): Promise<BomSimulationNode | null> {
    if (!productId || requestSeq !== this.simulationSeq) {
      return null;
    }

    const cycleDetected = path.has(productId);
    if (cycleDetected) {
      return {
        key,
        productId,
        productName: productId,
        quantityFromParent,
        level,
        isCycle: true,
        children: [],
      };
    }

    const response = await this.fetchBomDetailCached(productId);
    const node: BomSimulationNode = {
      key,
      productId,
      productName: response?.productName || response?.internalName || productId,
      quantityFromParent,
      level,
      isCycle: false,
      children: [],
    };

    if (!response || level >= BomDetailComponent.MAX_SIMULATION_DEPTH) {
      return node;
    }

    const components = Array.isArray(response?.components) ? response.components : [];
    if (!components.length) {
      return node;
    }

    const nextPath = new Set(path);
    nextPath.add(productId);

    const childPromises = components.map((component: BomApiComponent, index: number) =>
      this.buildSimulationNode(
        component?.productId ?? '',
        level + 1,
        `${key}/${component?.productId || 'unknown'}-${index}`,
        nextPath,
        requestSeq,
        String(component?.quantity ?? '-')
      )
    );

    const children = await Promise.all(childPromises);
    node.children = children.filter((child): child is BomSimulationNode => !!child);
    return node;
  }

  private async fetchBomDetailCached(productId: string): Promise<BomDetailApiResponse | null> {
    if (this.bomDetailCache.has(productId)) {
      return this.bomDetailCache.get(productId) ?? null;
    }
    try {
      const response = await firstValueFrom(this.manufacturingService.getBomDetail(productId));
      this.bomDetailCache.set(productId, response);
      return response;
    } catch {
      this.bomDetailCache.set(productId, null);
      return null;
    }
  }

  private collectExpandableNodeKeys(nodes: BomSimulationNode[]): string[] {
    const keys: string[] = [];
    nodes.forEach((node) => {
      if (node.children?.length) {
        keys.push(node.key, ...this.collectExpandableNodeKeys(node.children));
      }
    });
    return keys;
  }
}

interface BomSimulationNode {
  key: string;
  productId: string;
  productName: string;
  quantityFromParent: string;
  level: number;
  isCycle: boolean;
  children: BomSimulationNode[];
}
