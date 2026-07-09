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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { ProductService } from '@ofbiz/services/product/product.service';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { TranslateService } from '@ngx-translate/core';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { LotService } from '@ofbiz/services/lot/lot.service';
import { OrderService } from '@ofbiz/services/order/order.service';

@Component({
  standalone: false,
  selector: 'app-receive-asset-product',
  templateUrl: './receive-asset-product.component.html',
  styleUrls: ['./receive-asset-product.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiveAssetProductComponent implements OnInit {
  readonly isLoading = signal(false);
  private readonly cdr = inject(ChangeDetectorRef);
  createAssetForm: FormGroup;
  facilities: any[] = [];
  facilityLocations: any[] = [];
  statusList: any[] = this.getDefaultStatuses();
  filteredProducts$: Observable<any[]> = of([]);
  filteredParties$: Observable<any[]> = of([]);
  filteredLots$: Observable<any[]> = of([]);
  productIdControl = new FormControl();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private facilityService: FacilityService,
    private productService: ProductService,
    private assetService: AssetService,
    private snackbarService: SnackbarService,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService,
    private translate: TranslateService,
    private partyService: PartyService,
    private lotService: LotService,
    private orderService: OrderService
  ) {
    this.createAssetForm = this.fb.group({
      productId: ['', Validators.required],
      inventoryItemTypeId: ['NON_SERIAL_INV_ITEM'],
      statusId: ['INV_AVAILABLE', Validators.required],
      facilityId: ['', Validators.required],
      locationSeqId: [''],
      serialNumber: [''],
      lotId: [''],
      receivedDate: [''],
      manufacturedDate: [''],
      expirationDate: [''],
      quantity: ['', [Validators.required, Validators.min(1)]],
      acquireCost: ['', Validators.required],
      ownerPartyId: [''],
      comments: [''],
    });

    this.createAssetForm.get('facilityId')?.valueChanges.subscribe((facilityId) => {
      this.loadFacilityLocationsByFacility(facilityId);
      if (facilityId) {
        this.facilityService.getFacility(facilityId).subscribe({
          next: (facilityData: any) => {
            const ownerPartyId: string = facilityData?.ownerPartyId || facilityData?.facility?.ownerPartyId || '';
            if (ownerPartyId && !this.createAssetForm.get('ownerPartyId')?.value) {
              this.createAssetForm.get('ownerPartyId')?.setValue(ownerPartyId, { emitEvent: false });
            }
          },
          error: () => {},
        });
      }
    });

    effect(() => {
      this.facilities = this.referenceDataStore.facilities();
      this.preferredFacilityService.applyPreferredFacilityIfMissing(
        this.createAssetForm.get('facilityId'),
        this.facilities
      );
      const statuses = this.referenceDataStore.statusItemsByType('INVENTORY_ITEM');
      if (statuses.length > 0) {
        this.statusList = statuses;
      }
    });
  }

  ngOnInit(): void {
    this.initializeData();
    this.setupAutocomplete();
    this.loadDefaultOwnerParty();
    this.route.queryParamMap.subscribe((params) => {
      const productId = (params.get('productId') || '').trim();
      if (productId) {
        this.createAssetForm.patchValue({ productId });
        this.applyInventoryTypeForProductId(productId);
      }
    });
  }

  private applyInventoryTypeForProductId(productId: string): void {
    this.productService.getProduct(productId).subscribe({
      next: (detail: any) => {
        const product = detail?.product ?? detail;
        if (!product) {
          return;
        }
        const isSerialized = product.serialized === 'Y'
          || product.inventoryItemTypeId === 'SERIALIZED_INV_ITEM';
        this.createAssetForm.get('inventoryItemTypeId')?.setValue(
          isSerialized ? 'SERIALIZED_INV_ITEM' : 'NON_SERIAL_INV_ITEM'
        );
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  private loadDefaultOwnerParty(): void {
    this.orderService.getProductStores().subscribe({
      next: (stores: any) => {
        const list = Array.isArray(stores) ? stores : [];
        const partyId = list
          .map((s: any) => String(s?.payToPartyId || '').trim())
          .find((id: string) => !!id);
        if (partyId && !this.createAssetForm.get('ownerPartyId')?.value) {
          this.createAssetForm.get('ownerPartyId')?.setValue(partyId, { emitEvent: false });
        }
      },
      error: () => {},
    });
  }

  private setupAutocomplete(): void {
    // Dedicated subscription: auto-detect inventory type when user selects a product object
    this.createAssetForm.get('productId')!.valueChanges.subscribe((value: any) => {
      if (value && typeof value === 'object') {
        const isSerialized = value.inventoryItemTypeId === 'SERIALIZED_INV_ITEM' || value.serialized === 'Y';
        this.createAssetForm.get('inventoryItemTypeId')?.setValue(
          isSerialized ? 'SERIALIZED_INV_ITEM' : 'NON_SERIAL_INV_ITEM'
        );
        this.cdr.markForCheck();
      }
    });

    this.filteredProducts$ = this.createAssetForm.get('productId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: any) => this.getProductsFromService(value))
    );

    this.filteredParties$ = this.createAssetForm.get('ownerPartyId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: any) => this.getPartiesFromService(value))
    );

    this.filteredLots$ = this.createAssetForm.get('lotId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: any) => this.getLotsFromService(value))
    );
  }

  private loadFacilityLocationsByFacility(facilityId: string): void {
    if (!facilityId) {
      this.facilityLocations = [];
      this.createAssetForm.get('locationSeqId')?.setValue('');
      return;
    }
    this.facilityService.getFacilityLocations(facilityId, 0, 1000).subscribe({
      next: (response) => {
        this.facilityLocations = Array.isArray(response?.content) ? response.content : [];
        this.createAssetForm.get('locationSeqId')?.setValue('');
      },
      error: () => {
        this.facilityLocations = [];
        this.createAssetForm.get('locationSeqId')?.setValue('');
        this.snackbarService.showError(this.translate.instant('ASSET.LOAD_FACILITY_LOCATIONS_ERROR'));
      },
    });
  }

  private initializeData(): void {
    this.referenceDataStore.ensureStatusTypeLoaded('INVENTORY_ITEM');
    this.referenceDataStore.ensureFacilitiesLoaded();
  }

  displayProduct(product: any): string {
    if (!product) {
      return '';
    }
    if (typeof product === 'string') {
      return product;
    }
    return product.productName || product.name || product.internalName || product.productId || '';
  }

  displayParty(party: any): string {
    if (!party) {
      return '';
    }
    if (typeof party === 'string') {
      return party;
    }
    return party.name || party.partyId || '';
  }

  private getProductsFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.productId ?? '';
    if (!query) {
      return of([]);
    }
    return this.productService.getProductsAutocompleteFromOms(query).pipe(
      map((res: any) => res?.documentList ?? []),
      map((products: any[]) => {
        // If the typed value exactly matches a product ID, sync the inventory
        // type even though no autocomplete option object was selected.
        if (typeof value === 'string') {
          const exact = products.find((p: any) => p?.productId === value.trim());
          if (exact) {
            const isSerialized = exact.serialized === 'Y'
              || exact.inventoryItemTypeId === 'SERIALIZED_INV_ITEM';
            this.createAssetForm.get('inventoryItemTypeId')?.setValue(
              isSerialized ? 'SERIALIZED_INV_ITEM' : 'NON_SERIAL_INV_ITEM'
            );
            this.cdr.markForCheck();
          }
        }
        return products;
      }),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('ASSET.LOAD_PRODUCTS_ERROR'));
        return of([]);
      })
    );
  }

  private getPartiesFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.partyId ?? '';
    if (!query) {
      return of([]);
    }
    return this.partyService.getCustomersAutocompleteFromWms(query).pipe(
      map((res: any) => res?.resultList ?? []),
      catchError(() => of([]))
    );
  }

  private getLotsFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.lotId ?? '';
    if (!query || query.length < 1) {
      return of([]);
    }
    return this.lotService.listLots(0, query, 10).pipe(
      map((res) => res?.resultList ?? []),
      catchError(() => of([]))
    );
  }

  displayLot(lot: any): string {
    if (!lot) return '';
    if (typeof lot === 'string') return lot;
    const heat = lot.heatNumber ? ` (Heat: ${lot.heatNumber})` : '';
    return `${lot.lotId}${heat}`;
  }

  receiveAsset(): void {
    if (this.createAssetForm.invalid) {
      this.createAssetForm.markAllAsTouched();
      return;
    }

    const values = this.createAssetForm.value;
    const isSerialized = (values.inventoryItemTypeId || 'NON_SERIAL_INV_ITEM') === 'SERIALIZED_INV_ITEM';
    const qty = Number(values.quantity) || 1;

    // Serialized items must be whole number quantities
    if (isSerialized && !Number.isInteger(qty)) {
      this.snackbarService.showError(this.translate.instant('ASSET.SERIALIZED_WHOLE_QTY'));
      return;
    }

    this.isLoading.set(true);
    const payload = {
      ...values,
      productId: values?.productId?.productId ?? values?.productId,
      quantityAccepted: String(qty),
      unitCost: String(values.acquireCost),
      ownerPartyId: (values?.ownerPartyId?.partyId ?? values?.ownerPartyId) || null,
      serialNumber: values.serialNumber || null,
      lotId: (values?.lotId?.lotId ?? values?.lotId) || null,
      inventoryItemTypeId: values.inventoryItemTypeId || 'NON_SERIAL_INV_ITEM',
      statusId: values.statusId || 'INV_AVAILABLE',
      receivedDate: this.toLocalDateTime(values.receivedDate),
      manufacturedDate: this.toLocalDateTime(values.manufacturedDate),
      expirationDate: this.toLocalDateTime(values.expirationDate),
    };

    // Backend handles splitting: serialized qty=N → creates N items each with QOH=1
    this.assetService.receiveAsset(payload).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (result: any) => {
        const data = result?.data ?? result;
        const firstId = data?.assetId || data?.inventoryItemId;
        const unitsCreated = data?.unitsCreated || 1;
        if (!firstId) {
          this.snackbarService.showError(this.translate.instant('ASSET.RECEIVE_MISSING_ID'));
          return;
        }
        const msg = isSerialized && unitsCreated > 1
          ? this.translate.instant('ASSET.RECEIVE_SERIALIZED_SUCCESS', { count: unitsCreated })
          : this.translate.instant('ASSET.RECEIVE_SUCCESS');
        this.snackbarService.showSuccess(msg);
        this.createAssetForm.reset({ statusId: 'INV_AVAILABLE', inventoryItemTypeId: 'NON_SERIAL_INV_ITEM' });
        this.router.navigate([`/assets/${firstId}`]);
      },
      error: (err: any) => {
        const message = err?.error?.message || err?.message || this.translate.instant('ASSET.RECEIVE_ERROR');
        this.snackbarService.showError(message);
      }
    });
  }

  private toLocalDateTime(value: any): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T00:00:00`;
    }
    if (typeof value === 'string') {
      if (value.includes('T')) {
        return value;
      }
      return `${value}T00:00:00`;
    }
    return null;
  }

  private getDefaultStatuses(): any[] {
    return [
      { statusId: 'INV_AVAILABLE', description: 'Available' },
      { statusId: 'INV_IN_REPAIR', description: 'In Repair' },
      { statusId: 'INV_NS_DEFECTIVE', description: 'Defective' },
    ];
  }
}
