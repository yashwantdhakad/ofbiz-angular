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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ShipmentService } from '@ofbiz/services/shipment/shipment.service';
import { SalesShipmentPackageDialogComponent } from '../sales-shipment-package-dialog/sales-shipment-package-dialog.component';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SalesShipmentPhoneDialogComponent } from '../sales-shipment-phone-dialog/sales-shipment-phone-dialog.component';
import { SalesShipmentTrackingDialogComponent } from '../sales-shipment-tracking-dialog/sales-shipment-tracking-dialog.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

@Component({
  standalone: false,
  selector: 'app-sales-shipment-detail',
  templateUrl: './sales-shipment-detail.component.html',
  styleUrls: ['./sales-shipment-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesShipmentDetailComponent implements OnInit {
  isLoading = signal<boolean>(false);
  isGeneratingShippingLabel = signal<boolean>(false);
  shipmentId = signal<string>('');
  shipmentDetail = signal<any>(null);
  shippingLabelContentType = signal<string | null>(null);
  shippingLabelPreviewAvailable = signal<boolean>(false);
  shippingLabelThermalAvailable = signal<boolean>(false);
  items = signal<any[]>([]);
  packages = signal<any[]>([]);
  packageContents = signal<any[]>([]);
  packageRouteSegments = signal<any[]>([]);
  routeSegments = signal<any[]>([]);
  boxTypes = signal<any[]>([]);
  selectedItemSeqIds = signal<Set<string>>(new Set<string>());
  qtyToPackByItemSeqId = signal<Record<string, string>>({});
  shipmentMethodTypeMap = signal<Map<string, string>>(new Map<string, string>());
  shipToAddressLines = signal<string[]>([]);
  shipToPhone = signal<string>('-');
  shipToName = signal<string>('-');
  shipFromName = signal<string>('-');
  shipFromAddressLines = signal<string[]>([]);
  shipToAddress = signal<any>(null);
  shipToPhoneData = signal<any>(null);
  statusHistoryEntries = signal<StatusHistoryEntry[]>([]);

  showPackageFullView = computed(() => {
    return this.packages().length > 0 && !this.hasItemsLeftToPack();
  });

  canCreatePackage = computed(() => {
    return this.selectedItemsForPackage().length > 0;
  });

  displayShippingMethod = computed(() => {
    const firstSegment = this.routeSegments()[0];
    return this.getShipmentMethodDescription(firstSegment?.shipmentMethodTypeId);
  });

  displayCarrierParty = computed(() => {
    const firstSegment = this.routeSegments()[0];
    return firstSegment?.carrierPartyId || '-';
  });

  displayCarrierService = computed(() => {
    const firstSegment = this.routeSegments()[0];
    return firstSegment?.carrierService || '-';
  });

  hasShippingLabelPreview = computed(() => {
    return this.shippingLabelPreviewAvailable();
  });

  hasThermalShippingLabel = computed(() => {
    return this.shippingLabelThermalAvailable();
  });

  hasGeneratedShippingLabel = computed(() => {
    if (this.shippingLabelPreviewAvailable() || this.shippingLabelThermalAvailable()) {
      return true;
    }
    return this.packageRouteSegments().some((segment: any) => {
      const trackingCode = segment?.trackingCode;
      return !!trackingCode && trackingCode.toString().trim().length > 0;
    });
  });

  canGenerateShippingLabel = computed(() => {
    const firstSegment = this.routeSegments()[0];
    return (
      this.packages().length > 0 &&
      !this.hasGeneratedShippingLabel() &&
      !!firstSegment?.carrierPartyId &&
      !!(firstSegment?.carrierService || firstSegment?.shipmentMethodTypeId) &&
      this.shipmentDetail()?.statusId !== 'SHIPMENT_CANCELLED'
    );
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly shipmentService: ShipmentService,
    private readonly orderService: OrderService,
    private readonly dialog: MatDialog,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = params['shipmentId'] || '';
      this.shipmentId.set(id);
      if (!id) {
        return;
      }
      this.loadScreen();
    });
  }

  loadScreen(showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading.set(true);
    }
    this.shipmentService.getSalesShipmentDetail(this.shipmentId()).subscribe({
      next: (detail) => {
        this.shipmentDetail.set(detail?.shipment || detail);
        this.shippingLabelContentType.set(detail?.shippingLabelContentType || null);
        this.shippingLabelPreviewAvailable.set(!!detail?.shippingLabelPreviewAvailable);
        this.shippingLabelThermalAvailable.set(!!detail?.shippingLabelThermalAvailable);
        this.items.set(detail?.items || []);
        this.packages.set(detail?.packages || []);
        this.packageContents.set(detail?.packageContents || []);
        this.packageRouteSegments.set(detail?.packageRouteSegments || []);
        this.routeSegments.set(detail?.routeSegments || []);
        this.statusHistoryEntries.set(
          Array.isArray(detail?.statuses)
            ? detail.statuses
              .filter((entry: any) => !!entry?.statusId)
              .map((entry: any) => ({
                statusId: entry.statusId,
                statusLabel: this.getStatusDescription(entry.statusId),
                changedAt: entry.statusDate,
                changedBy: entry.changeByUserLoginId,
              }))
            : []
        );
        this.boxTypes.set(detail?.boxTypes || []);
        this.shipmentMethodTypeMap.set(new Map(
          Object.entries(detail?.shipmentMethodTypeMap || {})
        ));
        this.shipToName.set(detail?.shipToName || this.shipmentDetail()?.partyIdTo || '-');
        this.shipToAddressLines.set(detail?.shipToAddressLines || []);
        this.shipToPhone.set(detail?.shipToPhone || '-');
        this.shipToAddress.set(detail?.shipToAddress || null);
        this.shipToPhoneData.set(detail?.shipToPhoneData || null);
        this.shipFromName.set(detail?.shipFromName || this.shipmentDetail()?.originFacilityId || '-');
        this.shipFromAddressLines.set(detail?.shipFromAddressLines || []);
        this.initializeQtyToPack();
        if (showLoader) {
          this.isLoading.set(false);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.statusHistoryEntries.set([]);
        if (showLoader) {
          this.isLoading.set(false);
        }
        this.cdr.markForCheck();
      },
    });
  }

  private refreshSilently(): void {
    this.loadScreen(false);
  }

  getStatusDescription(statusId?: string): string {
    if (!statusId) {
      return '-';
    }
    return statusId
      .replace(/^SHIPMENT_/, '')
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }

  getShipmentMethodDescription(shipmentMethodTypeId?: string): string {
    if (!shipmentMethodTypeId) {
      return '-';
    }
    return this.shipmentMethodTypeMap().get(shipmentMethodTypeId) || shipmentMethodTypeId;
  }

  getPackedQty(shipmentItemSeqId: string): number {
    return this.packageContents()
      .filter((item: any) => item?.shipmentItemSeqId === shipmentItemSeqId)
      .reduce((sum: number, item: any) => sum + this.toNumber(item?.quantity), 0);
  }

  getQtyToPack(item: any): number {
    const shipmentItemSeqId = item?.shipmentItemSeqId;
    if (!shipmentItemSeqId) {
      return 0;
    }
    return this.toNumber(this.qtyToPackByItemSeqId()[shipmentItemSeqId]);
  }

  updateQtyToPack(shipmentItemSeqId: string, value: string): void {
    this.qtyToPackByItemSeqId.update(record => {
      const next = { ...record };
      next[shipmentItemSeqId] = value;
      return next;
    });
  }

  toggleItemSelection(shipmentItemSeqId: string, isChecked: boolean): void {
    this.selectedItemSeqIds.update(set => {
      const next = new Set(set);
      if (isChecked) {
        next.add(shipmentItemSeqId);
      } else {
        next.delete(shipmentItemSeqId);
      }
      return next;
    });
  }

  getRemainingQty(item: any): number {
    const total = this.toNumber(item?.quantity);
    const packed = this.getPackedQty(item?.shipmentItemSeqId);
    return Math.max(total - packed, 0);
  }

  hasItemsLeftToPack(): boolean {
    return this.items().some((item: any) => this.getRemainingQty(item) > 0);
  }

  openCreatePackageDialog(): void {
    const selectedItems = this.selectedItemsForPackage();
    if (selectedItems.length === 0) {
      return;
    }

    const boxTypes = this.boxTypes();
    const dialogRef = this.dialog.open(SalesShipmentPackageDialogComponent, {
      width: '640px',
      data: {
        boxTypes,
        defaultBoxTypeId: boxTypes.find((item: any) => item?.shipmentBoxTypeId === 'YOURPACKNG')?.shipmentBoxTypeId
          || boxTypes[0]?.shipmentBoxTypeId
          || '',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      const payload = {
        shipmentBoxTypeId: result.shipmentBoxTypeId,
        boxLength: result.boxLength,
        boxWidth: result.boxWidth,
        boxHeight: result.boxHeight,
        dimensionUomId: 'LEN_in',
        weight: result.weight,
        weightUomId: 'WT_lb',
        boxNo: result.boxNo,
        items: selectedItems.map((item) => ({
          shipmentItemSeqId: item.shipmentItemSeqId,
          quantity: String(item.quantity),
        })),
      };

      this.shipmentService.addShipmentPackage(this.shipmentId(), payload).subscribe({
        next: () => {
          this.selectedItemSeqIds.set(new Set());
          this.refreshSilently();
        },
      });
    });
  }

  quickShip(): void {
    this.shipmentService.shipShipment(this.shipmentId()).subscribe({
      next: () => this.refreshSilently(),
    });
  }

  cancelOrder(): void {
    this.shipmentService.updateShipmentStatus(this.shipmentId(), 'SHIPMENT_CANCELLED').subscribe({
      next: () => this.refreshSilently(),
    });
  }

  editShipToAddress(): void {
    const shipmentDetail = this.shipmentDetail();
    const orderId = shipmentDetail?.primaryOrderId;
    if (!orderId) {
      return;
    }
    const shipToAddress = this.shipToAddress();
    const postal = shipToAddress?.postalAddress || {};
    const addressData = {
      orderId,
      contactMechId: shipToAddress?.contactMechId,
      contactMechPurposeId: shipToAddress?.contactMechPurposeTypeId || 'SHIPPING_LOCATION',
      defaultPurpose: 'SHIPPING_LOCATION',
      toName: postal?.toName,
      address1: postal?.address1,
      address2: postal?.address2,
      city: postal?.city,
      postalCode: postal?.postalCode,
      countryGeoId: postal?.countryGeoId,
      stateProvinceGeoId: postal?.stateProvinceGeoId || postal?.stateProvinceGeo?.geoName,
    };

    this.dialog
      .open(AddEditAddressComponent, { data: { addressData } })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.refreshSilently();
      });
  }

  editShipToPhone(): void {
    const shipmentDetail = this.shipmentDetail();
    const orderId = shipmentDetail?.primaryOrderId;
    if (!orderId) {
      return;
    }
    const shipToPhoneData = this.shipToPhoneData();
    const telecomNumber = shipToPhoneData?.telecomNumber || {};
    this.dialog
      .open(SalesShipmentPhoneDialogComponent, {
        data: {
          countryCode: telecomNumber?.countryCode || '',
          areaCode: telecomNumber?.areaCode || '',
          contactNumber: telecomNumber?.contactNumber || '',
        },
      })
      .afterClosed()
      .subscribe((payload: any) => {
        if (!payload?.contactNumber) {
          return;
        }
        this.orderService.upsertOrderShippingPhone(orderId, payload).subscribe({
          next: () => this.refreshSilently(),
        });
      });
  }

  editHandlingInstructions(): void {
    const shipmentDetail = this.shipmentDetail();
    const orderId = shipmentDetail?.primaryOrderId;
    const shipGroupSeqId = shipmentDetail?.primaryShipGroupSeqId;
    if (!orderId || !shipGroupSeqId) {
      return;
    }
    this.dialog
      .open(ShippingInstructionDialogComponent, {
        data: {
          titleKey: 'SHIPMENT.HANDLING_INST',
          shippingInstructions: shipmentDetail?.handlingInstructions || '',
        },
      })
      .afterClosed()
      .subscribe((shippingInstructions: string | null) => {
        if (shippingInstructions === null) {
          return;
        }
        this.orderService.updateShippingInstructions(orderId, shipGroupSeqId, shippingInstructions).subscribe({
          next: () => this.refreshSilently(),
        });
      });
  }

  getPackageContentsForPackage(shipmentPackageSeqId: string): any[] {
    const items = this.items();
    return this.packageContents()
      .filter((item: any) => item?.shipmentPackageSeqId === shipmentPackageSeqId)
      .map((content: any) => {
        const shipmentItem = items.find(
          (item: any) => item?.shipmentItemSeqId === content?.shipmentItemSeqId
        );
        return {
          ...content,
          productId: shipmentItem?.productId || '-',
          description: shipmentItem?.shipmentContentDescription || '-',
        };
      });
  }

  getTrackingCodeForPackage(shipmentPackageSeqId: string): string {
    const routeSeg = this.packageRouteSegments().find(
      (item: any) => item?.shipmentPackageSeqId === shipmentPackageSeqId
    );
    return routeSeg?.trackingCode || routeSeg?.trackingIdNumber || '-';
  }

  openEditTrackingDialog(shipmentPackageSeqId: string): void {
    const current = this.getTrackingCodeForPackage(shipmentPackageSeqId);
    const dialogRef = this.dialog.open(SalesShipmentTrackingDialogComponent, {
      width: '420px',
      data: {
        packageSeqId: shipmentPackageSeqId,
        currentTrackingCode: current === '-' ? '' : current,
      },
    });
    dialogRef.afterClosed().subscribe((trackingCode: string | undefined) => {
      if (trackingCode === undefined) return;
      const shipmentId = this.shipmentId();
      if (!shipmentId) return;
      this.shipmentService.updatePackageTrackingCode(shipmentId, shipmentPackageSeqId, trackingCode).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('SHIPMENT.TRACKING_CODE_UPDATED'));
          this.refreshSilently();
        },
        error: (err) => {
          const message = err?.error?.message || this.translate.instant('SHIPMENT.TRACKING_CODE_UPDATE_ERROR');
          this.snackbarService.showError(message);
        },
      });
    });
  }

  printPackingSlipPdf(): void {
    const shipmentId = this.shipmentId();
    if (!shipmentId) {
      return;
    }
    this.shipmentService.getPackingSlipPdf(shipmentId).subscribe({
      next: (html: string) => {
        if (!html) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.location.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      },
    });
  }

  previewShippingLabel(): void {
    const shipmentId = this.shipmentId();
    if (!shipmentId) {
      return;
    }
    this.shipmentService.getShippingLabelPdf(shipmentId).subscribe({
      next: (html: string) => {
        if (!html) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.location.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      },
      error: (error) => {
        const message = error?.error?.message
          || error?.error?.reason
          || this.translate.instant('SHIPMENT.SHIPPING_LABEL_PREVIEW_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  printShippingLabel(): void {
    const shipmentId = this.shipmentId();
    if (!shipmentId) {
      return;
    }
    this.shipmentService.printShippingLabel(shipmentId).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.snackbarService.showError(this.translate.instant('SHIPMENT.SHIPPING_LABEL_PRINT_ERROR'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = this.extractFilename(response.headers.get('Content-Disposition'))
          || `${shipmentId}-shipping-label`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: (error) => {
        const message = error?.error?.message
          || error?.error?.reason
          || this.translate.instant('SHIPMENT.SHIPPING_LABEL_PRINT_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }
    const match = /filename="([^"]+)"/i.exec(contentDisposition);
    return match?.[1] || null;
  }

  generateShippingLabel(): void {
    const shipmentId = this.shipmentId();
    const firstSegment = this.routeSegments()[0];
    if (!shipmentId || !firstSegment?.carrierPartyId || this.isGeneratingShippingLabel()) {
      return;
    }
    const shipmentPackageSeqIds = this.packages()
      .map((pkg: any) => pkg?.shipmentPackageSeqId)
      .filter((value: string | null | undefined) => !!value);
    if (shipmentPackageSeqIds.length === 0) {
      return;
    }
    this.isGeneratingShippingLabel.set(true);
    this.shipmentService.generateCarrierLabels(shipmentId, {
      carrier: firstSegment.carrierPartyId,
      serviceCode: firstSegment.carrierService || firstSegment.shipmentMethodTypeId,
      shipmentPackageSeqIds,
    }).subscribe({
      next: () => {
        this.isGeneratingShippingLabel.set(false);
        this.refreshSilently();
      },
      error: (error) => {
        this.isGeneratingShippingLabel.set(false);
        const message = error?.error?.message
          || error?.error?.reason
          || this.translate.instant('SHIPMENT.SHIPPING_LABEL_GENERATE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  getBoxTypeLabel(shipmentBoxTypeId: string): string {
    if (!shipmentBoxTypeId) {
      return '-';
    }
    const boxType = this.boxTypes().find((item: any) => item?.shipmentBoxTypeId === shipmentBoxTypeId);
    return boxType?.description || shipmentBoxTypeId;
  }

  deletePackage(shipmentPackageSeqId: string): void {
    const shipmentId = this.shipmentId();
    if (!shipmentPackageSeqId || !shipmentId || this.shipmentDetail()?.statusId === 'SHIPMENT_SHIPPED') {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('SHIPMENT.DELETE_PACKAGE_CONFIRM'),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.shipmentService.deleteShipmentPackage(shipmentId, shipmentPackageSeqId).subscribe({
        next: () => {
          this.selectedItemSeqIds.set(new Set());
          this.snackbarService.showSuccess(this.translate.instant('SHIPMENT.DELETE_PACKAGE_SUCCESS'));
          this.refreshSilently();
        },
        error: (err) => {
          const message = err?.error?.message || this.translate.instant('SHIPMENT.DELETE_PACKAGE_ERROR');
          this.snackbarService.showError(message);
        },
      });
    });
  }

  private initializeQtyToPack(): void {
    const next: Record<string, string> = {};
    for (const item of this.items()) {
      const remaining = this.getRemainingQty(item);
      next[item.shipmentItemSeqId] = String(remaining);
    }
    this.qtyToPackByItemSeqId.set(next);
  }

  private selectedItemsForPackage(): Array<{ shipmentItemSeqId: string; quantity: number }> {
    const selectedItemSeqIds = this.selectedItemSeqIds();
    return this.items()
      .filter((item: any) => selectedItemSeqIds.has(item.shipmentItemSeqId))
      .map((item: any) => ({
        shipmentItemSeqId: item.shipmentItemSeqId,
        quantity: Math.min(this.getQtyToPack(item), this.getRemainingQty(item)),
      }))
      .filter((item: any) => item.quantity > 0);
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  private formatAddressLines(postal: any): string[] {
    if (!postal) {
      return [];
    }
    const lines: string[] = [];
    if (postal?.address1) {
      lines.push(postal.address1);
    }
    if (postal?.address2) {
      lines.push(postal.address2);
    }
    const cityStatePostal = [postal?.city, postal?.stateProvinceGeoId, postal?.postalCode]
      .filter((part: string) => !!part && part.toString().trim().length > 0)
      .join(' ');
    if (cityStatePostal) {
      lines.push(cityStatePostal);
    }
    if (postal?.countryGeoId) {
      lines.push(postal.countryGeoId);
    }
    return lines;
  }

  private formatPhone(phone: any): string {
    if (!phone) {
      return '-';
    }
    const telecom = phone?.telecomNumber || phone;
    const formatted = [telecom?.countryCode, telecom?.areaCode, telecom?.contactNumber]
      .filter((part: string) => !!part && part.toString().trim().length > 0)
      .join(' ');
    return formatted || '-';
  }
}
