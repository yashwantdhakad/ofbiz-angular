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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, computed, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { AddEditEmailComponent } from '@ofbiz/components/party/add-edit-email/add-edit-email.component';
import { AddEditPhoneComponent } from '@ofbiz/components/party/add-edit-phone/add-edit-phone.component';
import { AddIdentificationComponent } from '@ofbiz/components/party/add-identification/add-identification.component';
import { AddRoleComponent } from '@ofbiz/components/party/add-role/add-role.component';
import { filterGeoRecords, GeoListObject } from '@ofbiz/helpers/geo-type-helper';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { loadGeos } from '@ofbiz/store/geo/geo.actions';
import { selectGeoList } from '@ofbiz/store/geo/geo.selector';
import { GeoState } from '@ofbiz/store/geo/geo.state';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { EditSupplierComponent } from '../edit-supplier/edit-supplier.component';
import { AddEditCreditCardComponent } from '../../party/add-edit-credit-card/add-edit-credit-card.component';
import { AddEditBankAccountComponent } from '../../party/add-edit-bank-account/add-edit-bank-account.component';
import { PartyNoteComponent } from '../../party/party-note/party-note.component';
import { PartyContentComponent } from '../../party/party-content/party-content.component';
import { SupplierProductDialogComponent } from '../supplier-product-dialog/supplier-product-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import {
  EmailAddress,
  Party,
  PartyClassification,
  PartyContent,
  PartyIdentification,
  PartyNote,
  PartyPaymentSummary,
  PartyRole,
  PostalAddress,
  RoleLookupItem,
  SupplierDetailPayload,
  SupplierDetailResponse,
  SupplierProductSummary,
  TelecomNumber,
} from '@ofbiz/models/party.model';
import { AddClassificationComponent } from '@ofbiz/components/party/add-classification/add-classification.component';

type PartyDialogResult = { partyId?: string } | null | undefined;
type DeleteRolePayload = { partyId?: string; roleTypeId?: string; roleType?: string };
type DeleteNotePayload = { partyId?: string; noteId?: string };

@Component({
  standalone: false,
  selector: 'app-supplier-detail',
  templateUrl: './supplier-detail.component.html',
  styleUrls: ['./supplier-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierDetailComponent implements OnInit {
  roles: PartyRole[] = [];
  partyClassifications: PartyClassification[] = [];
  partyIdentificationList: PartyIdentification[] = [];
  postalAddressList: PostalAddress[] = [];
  emailAddressList: EmailAddress[] = [];
  telecomNumberList: TelecomNumber[] = [];
  payments: PartyPaymentSummary[] = [];
  readonly isLoading = signal(true);
  partyId: string | undefined;

  supplierDetail: Party | undefined;
  partyRoleList: PartyRole[] = [];
  primaryAddressList: PostalAddress[] = [];
  primaryPhoneList: TelecomNumber[] = [];
  billingPhoneList: TelecomNumber[] = [];
  shippingPhoneList: TelecomNumber[] = [];
  shippingAddressList: PostalAddress[] = [];
  billingAddress: PostalAddress | undefined;
  shippingEmailAddressList: EmailAddress[] = [];
  billingEmailAddressList: EmailAddress[] = [];
  primaryEmailAddressList: EmailAddress[] = [];
  primaryEmailAddress: EmailAddress | undefined;
  readonly geoRecords = signal<GeoListObject | null>(null);
  readonly countries = computed(() => filterGeoRecords(this.geoRecords(), 'COUNTRY'));
  readonly states = computed(() => filterGeoRecords(this.geoRecords(), 'STATE'));
  roleTypes: RoleLookupItem[] | undefined;
  readonly roleTypeDescriptionMap = signal(new Map<string, string>());

  partyNotes: PartyNote[] = [];
  noteColumns: string[] = ['noteText', 'noteDate', 'userId', 'action'];
  supplierProductColumns: string[] = ['productId', 'supplierProductName', 'lastPrice', 'action'];
  supplierProducts: SupplierProductSummary[] = [];
  supplierProductsTotal = 0;
  supplierProductsPageIndex = 0;
  supplierProductsPageSize = 20;
  supplierProductsPageSizeOptions: number[] = [10, 20, 50, 100];
  contents: PartyContent[] = [];
  contentColumns: string[] = ['description', 'contentDate', 'contentLocation'];

  constructor(
    private fb: FormBuilder,
    private partyService: PartyService,
    private commonService: CommonService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private store: Store<GeoState>,
    private supplierProductService: SupplierProductService,
    private snackbarService: SnackbarService,
    private renderScheduler: RenderSchedulerService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) { }

  ngOnInit(): void {
    this.loadRoleTypeDescriptions();
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.partyId = params['partyId'];
      if (this.partyId) {
        this.setLoading(true);
        this.getSupplier(this.partyId);
      }
    });

    this.store.dispatch(loadGeos());
    this.store
      .pipe(select(selectGeoList), takeUntilDestroyed(this.destroyRef))
      .subscribe((geoListObject: any) => {
        this.geoRecords.set(geoListObject ?? null);
      });

  }

  private loadRoleTypeDescriptions(): void {
    this.commonService.getLookupResults({}, 'roletypes').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items: RoleLookupItem[]) => {
        const list: RoleLookupItem[] = Array.isArray(items) ? items : [];
        // Defer to next macrotask to avoid NG0100 in template role-label rendering.
        this.renderScheduler.deferMacrotask(() => {
          this.roleTypeDescriptionMap.set(new Map(
            list
              .filter((item) => !!item?.roleTypeId)
              .map((item) => [item.roleTypeId, item.description || item.roleTypeId])
          ));
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.roleTypeDescriptionMap.set(new Map());
          this.cdr.markForCheck();
        });
      },
    });
  }

  getRoleLabel(role: Partial<PartyRole> & { roleType?: string }): string {
    const roleTypeId = role?.roleTypeId || role?.roleType;
    if (!roleTypeId) {
      return role?.roleTypeDescription || role?.description || '';
    }
    const translatedRole = this.translateRole(roleTypeId);
    if (translatedRole) {
      return translatedRole;
    }
    return (
      role?.roleTypeDescription
      || role?.description
      || this.roleTypeDescriptionMap().get(roleTypeId)
      || roleTypeId
    );
  }

  private translateRole(roleTypeId: string): string | null {
    const normalized = roleTypeId.trim().toUpperCase();
    const roleKeys: Record<string, string> = { CUSTOMER: 'COMMON.CUSTOMER', SUPPLIER: 'COMMON.SUPPLIER' };
    const key = roleKeys[normalized] ?? null;
    if (!key) {
      return null;
    }
    const translated = this.translate.instant(key);
    return translated !== key ? translated : null;
  }

  getSupplier(partyId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.setLoading(true);
    }
    this.partyService.getSupplier(partyId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: SupplierDetailResponse) => {
        const supplierDetail: SupplierDetailPayload = response?.supplierDetail || {};
        const {
          partyRoleList,
          party,
          partyIdentificationList,
          pcaaList,
          emailAddressList,
          telecomNumberList,
          postalAddressList,
          payments,
          partyNoteList,
          contentList,
          supplierProducts,
          supplierProductsTotal,
          supplierProductsPageIndex,
          supplierProductsPageSize,
        } = supplierDetail;

        this.roles = partyRoleList || [];
        this.supplierDetail = party;
        this.partyRoleList = partyRoleList || [];
        this.partyIdentificationList = partyIdentificationList || [];
        this.partyClassifications = pcaaList || [];
        this.emailAddressList = emailAddressList || [];
        this.telecomNumberList = telecomNumberList || [];
        this.postalAddressList = postalAddressList || [];
        this.payments = payments || [];
        this.partyNotes = (partyNoteList || []).map((note): PartyNote => ({
          ...note,
          partyId: note.partyId ?? partyId,
        }));
        this.contents = Array.isArray(contentList) ? contentList : [];
        this.supplierProducts = Array.isArray(supplierProducts) ? supplierProducts : [];
        this.supplierProductsTotal = Number(
          supplierProductsTotal
          ?? this.supplierProducts.length
        );
        this.supplierProductsPageIndex = Number(supplierProductsPageIndex ?? 0);
        this.supplierProductsPageSize = Number(supplierProductsPageSize ?? this.supplierProductsPageSize);
        if (showLoader) {
          this.isLoading.set(false);
          this.hasLoaded = true;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        if (showLoader) {
          this.isLoading.set(false);
          this.hasLoaded = true;
        }
        this.cdr.markForCheck();
      },
    });
  }

  private refreshSupplierSilently(partyId?: string): void {
    const id = partyId || this.partyId;
    if (!id) {
      return;
    }
    this.getSupplier(id, false);
  }

  maskAccountNumber(accountNumber?: string | null): string {
    const digits = (accountNumber ?? '').toString().trim();
    if (!digits) {
      return '';
    }
    if (digits.length <= 4) {
      return digits;
    }
    return `${'*'.repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
  }

  loadSupplierProducts(partyId: string, page: number = this.supplierProductsPageIndex, size: number = this.supplierProductsPageSize): void {
    this.supplierProductService.listByPartyPaged(partyId, page, size).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const content = [response?.resultList, response?.content]
          .find((candidate: any) => Array.isArray(candidate)) ?? [];
        this.supplierProducts = content;
        this.supplierProductsTotal = Number(
          response?.documentListCount
          ?? response?.totalElements
          ?? response?.total
          ?? content.length
        );
        this.supplierProductsPageIndex = Number(response?.pageIndex ?? response?.number ?? page);
        this.supplierProductsPageSize = Number(response?.pageSize ?? response?.size ?? size);
        this.cdr.markForCheck();
      },
      error: () => {
        this.supplierProducts = [];
        this.supplierProductsTotal = 0;
        this.cdr.markForCheck();
      },
    });
  }

  onSupplierProductsPageChange(event: PageEvent): void {
    this.supplierProductsPageIndex = event.pageIndex;
    this.supplierProductsPageSize = event.pageSize;
    if (this.partyId) {
      this.loadSupplierProducts(this.partyId, event.pageIndex, event.pageSize);
    }
  }

  private setLoading(isLoading: boolean): void {
    if (!this.hasLoaded && !isLoading) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(isLoading);
    this.cdr.markForCheck();
  }

  private hasLoaded = false;

  addSupplierProductDialog(): void {
    if (!this.partyId) {
      return;
    }
    this.dialog
      .open(SupplierProductDialogComponent, {
        data: { partyId: this.partyId },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: unknown) => {
        if (result && this.partyId) {
          this.loadSupplierProducts(this.partyId, this.supplierProductsPageIndex, this.supplierProductsPageSize);
        }
      });
  }

  addUpdateContentDialog(params: Partial<PartyContent> | null = null): void {
    const contentData = {
      ...params,
      partyId: this.partyId,
    };

    this.dialog
      .open(PartyContentComponent, {
        data: {
          contentData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result?.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  openPartyContent(item: Partial<PartyContent> | null | undefined): void {
    if (!this.partyId || !item?.contentId) {
      return;
    }
    this.partyService.downloadPartyContent(this.partyId, item.contentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
      },
    });
  }

  deleteSupplierProduct(item: SupplierProductSummary): void {
    const supplierProductId = typeof item?.id === 'number' ? item.id : Number(item?.id);
    if (!Number.isFinite(supplierProductId)) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('SUPPLIER.DELETE_SUPPLIER_PRODUCT_TITLE'),
        message: this.translate.instant('SUPPLIER.DELETE_SUPPLIER_PRODUCT_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.supplierProductService.delete(supplierProductId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.loadSupplierProducts(this.partyId || '', this.supplierProductsPageIndex, this.supplierProductsPageSize),
        });
      }
    });
  }

  filterEmailAddressList(emailAddressList: EmailAddress[], purpose: string): EmailAddress[] {
    return (
      emailAddressList?.filter(
        (email) => email.contactMechPurposeId === purpose
      ) || []
    );
  }

  filterTelecomNumberList(telecomNumberList: TelecomNumber[], purpose: string): TelecomNumber[] {
    return (
      telecomNumberList?.filter(
        (telecomNumber) =>
          telecomNumber.contactMechPurposeId === purpose
      ) || []
    );
  }

  trackByRole = (_: number, role: Partial<PartyRole> & { partyRoleId?: string; roleType?: string }): string | number =>
    role?.partyRoleId ?? role?.roleTypeId ?? role?.roleType ?? _;

  trackByPayment = (_: number, payment: PartyPaymentSummary): string | number =>
    payment?.paymentMethod?.paymentMethodId ?? payment?.paymentMethodId ?? _;

  editSupplierDialog(): void {
    this.dialog
      .open(EditSupplierComponent, {
        data: {
          supplierDetail: this.supplierDetail,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result && result.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  addIdentificationDialog(params: Partial<PartyIdentification> | null = null): void {
    const identificationData = {
      ...params,
      partyId: this.partyId,
    };

    this.dialog
      .open(AddIdentificationComponent, {
        data: {
          identificationData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result && result.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  async deleteIdentificationDialog(params: Partial<PartyIdentification> & { partyId?: string }): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('SUPPLIER.DELETE_IDENTIFICATION_TITLE'),
        message: this.translate.instant('SUPPLIER.DELETE_IDENTIFICATION_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteIdentification(params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshSupplierSilently(params.partyId);
        });
      }
    });
  }

  addClassificationDialog(params: Partial<PartyClassification> | null = null): void {
    const classificationData =
      params && params.classificationTypeEnumId == null
        ? { partyId: this.partyId }
        : { ...params, partyId: this.partyId };

    this.dialog
      .open(AddClassificationComponent, {
        data: { classificationData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result?.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  deleteClassificationDialog(params: Partial<PartyClassification> & { partyId?: string }): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('CUSTOMER.CLASSIFICATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteClassification(params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshSupplierSilently(params.partyId);
        });
      }
    });
  }

  addRoleDialog(params: Partial<PartyRole> | null = null): void {
    const roleData = {
      ...params,
      partyId: this.partyId,
    };

    const dialogRef = this.dialog.open(AddRoleComponent, {
      data: { roleData },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: PartyDialogResult) => {
      if (result && result.partyId) {
        this.refreshSupplierSilently(result.partyId);
      }
    });
  }

  async deleteRoleDialog(params: DeleteRolePayload): Promise<void> {
    const deletePayload = {
      partyId: params?.partyId || this.partyId,
      roleTypeId: params?.roleTypeId || params?.roleType,
    };
    if (!deletePayload.partyId || !deletePayload.roleTypeId) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('SUPPLIER.DELETE_ROLE_TITLE'),
        message: this.translate.instant('SUPPLIER.DELETE_ROLE_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteRole(deletePayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshSupplierSilently(deletePayload.partyId as string);
        });
      }
    });
  }

  addEditPhoneDialog(params: (Partial<TelecomNumber> & { partyId?: string }) | null = null): void {
    const addEditPhoneData = params
      ? { ...params, partyId: this.partyId }
      : { partyId: this.partyId };

    this.dialog
      .open(AddEditPhoneComponent, {
        data: {
          addEditPhoneData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result && result.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  addEditEmailDialog(params: (Partial<EmailAddress> & { partyId?: string }) | null = null): void {
    const addEditEmailData = params
      ? { ...params, partyId: this.partyId }
      : { partyId: this.partyId };

    this.dialog
      .open(AddEditEmailComponent, {
        data: { addEditEmailData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result && result.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  async deleteEmailDialog(params: Partial<EmailAddress> & { partyId?: string }): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('SUPPLIER.DELETE_EMAIL_TITLE'),
        message: this.translate.instant('SUPPLIER.DELETE_EMAIL_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteEmail(params as import('@ofbiz/models/party.model').PartyContactMechPayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshSupplierSilently(params.partyId);
        });
      }
    });
  }

  async deletePhoneDialog(params: Partial<TelecomNumber> & { partyId?: string }): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('SUPPLIER.DELETE_PHONE_TITLE'),
        message: this.translate.instant('SUPPLIER.DELETE_PHONE_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteContactMech(params as import('@ofbiz/models/party.model').PartyContactMechPayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshSupplierSilently(params.partyId);
        });
      }
    });
  }

  addEditAddressDialog(params: Partial<PostalAddress> | null = null): void {
    const addressData = {
      ...params,
      partyId: this.partyId,
      countries: this.countries(),
      states: this.states(),
    };

    this.dialog
      .open(AddEditAddressComponent, {
        data: {
          addressData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result?.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  addEditCreditCardDialog(params: Record<string, unknown> | null = null): void {
    const creditCardData = {
      ...params,
      partyId: this.partyId,
      countries: this.countries(),
      states: this.states(),
      postalAddressList: this.postalAddressList,
      roleTypeId: 'SUPPLIER',
    };

    this.dialog
      .open(AddEditCreditCardComponent, {
        data: {
          creditCardData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result?.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }



  addEditBankAccountDialog(params: Record<string, unknown> | null = null): void {
    const bankAccountData = {
      ...params,
      partyId: this.partyId,
      countries: this.countries(),
      states: this.states(),
      postalAddressList: this.postalAddressList,
      roleTypeId: 'SUPPLIER',
    };

    this.dialog
      .open(AddEditBankAccountComponent, {
        data: {
          bankAccountData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result?.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }

  addUpdateNoteDialog(params: Partial<PartyNote> | null = null): void {
    const noteData = {
      ...params,
      partyId: this.partyId,
    };

    this.dialog
      .open(PartyNoteComponent, {
        data: {
          noteData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result?.partyId) {
          this.refreshSupplierSilently(result.partyId);
        }
      });
  }
  async deleteNoteDialog(params: DeleteNotePayload): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('SUPPLIER.DELETE_NOTE_TITLE'),
        message: this.translate.instant('SUPPLIER.DELETE_NOTE_MESSAGE'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        const payload = {
          partyId: this.partyId ?? params?.partyId,
          noteId: params?.noteId,
        };
        this.partyService.deletePartyNote(payload as import('@ofbiz/models/party.model').PartyNotePayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          if (this.partyId) {
            this.refreshSupplierSilently(this.partyId);
          }
        });
      }
    });

  }
}
