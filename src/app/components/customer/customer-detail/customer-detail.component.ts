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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { AddClassificationComponent } from '@ofbiz/components/party/add-classification/add-classification.component';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { AddEditEmailComponent } from '@ofbiz/components/party/add-edit-email/add-edit-email.component';
import { AddEditPhoneComponent } from '@ofbiz/components/party/add-edit-phone/add-edit-phone.component';
import { AddIdentificationComponent } from '@ofbiz/components/party/add-identification/add-identification.component';
import { AddRoleComponent } from '@ofbiz/components/party/add-role/add-role.component';
import { filterGeoRecords, GeoListObject } from '@ofbiz/helpers/geo-type-helper';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { loadGeos } from '@ofbiz/store/geo/geo.actions';
import { selectGeoList } from '@ofbiz/store/geo/geo.selector';
import { GeoState } from '@ofbiz/store/geo/geo.state';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { EditCustomerComponent } from '../edit-customer/edit-customer.component';
import { AddEditCreditCardComponent } from '../../party/add-edit-credit-card/add-edit-credit-card.component';
import { AddEditBankAccountComponent } from '../../party/add-edit-bank-account/add-edit-bank-account.component';
import { PartyNoteComponent } from '../../party/party-note/party-note.component';
import { PartyContentComponent } from '../../party/party-content/party-content.component';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { TranslateService } from '@ngx-translate/core';
import {
  Party,
  PartyRole,
  PartyClassification,
  PartyIdentification,
  PostalAddress,
  EmailAddress,
  TelecomNumber,
  PartyNote,
  PartyContent,
  CustomerDetailPayload,
  CustomerDetailResponse,
  PartyPaymentSummary,
  RoleLookupItem,
} from '@ofbiz/models/party.model';

type PartyDialogResult = { partyId?: string } | null | undefined;
type DeleteRolePayload = { partyId?: string; roleTypeId?: string; roleType?: string };
type DeleteNotePayload = { partyId?: string; noteId?: string };

@Component({
  standalone: false,
  selector: 'app-customer-detail',
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailComponent implements OnInit {
  roles: PartyRole[] = [];
  partyClassifications: PartyClassification[] = [];
  partyIdentificationList: PartyIdentification[] = [];
  postalAddressList: PostalAddress[] = [];
  emailAddressList: EmailAddress[] = [];
  telecomNumberList: TelecomNumber[] = [];
  payments: PartyPaymentSummary[] = [];
  readonly isLoading = signal(false);
  emailForm: FormGroup;
  partyId: string | undefined;

  customerDetail: Party | undefined;
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

  contents: PartyContent[] = [];
  contentColumns: string[] = ['description', 'contentDate', 'contentLocation'];

  partyNotes: PartyNote[] = [];
  noteColumns: string[] = ['noteText', 'noteDate', 'userId', 'action'];
  readonly roleTypeDescriptionMap = signal(new Map<string, string>());

  constructor(
    private fb: FormBuilder,
    private partyService: PartyService,
    private commonService: CommonService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private store: Store<GeoState>,
    private renderScheduler: RenderSchedulerService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {
    this.emailForm = this.fb.group({
      organizationName: ['', Validators.required],
      emailAddress: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.minLength(10)]],
      roleTypeId: ['Supplier'],
    });
  }

  ngOnInit(): void {
    this.loadRoleTypeDescriptions();
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.partyId = params['partyId'];
      if (this.partyId) {
        this.isLoading.set(true);
        this.getCustomer(this.partyId);
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
        });
      },
      error: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.roleTypeDescriptionMap.set(new Map());
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

  getCustomer(partyId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading.set(true);
    }
    this.partyService.getCustomer(partyId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: CustomerDetailResponse) => {
        const customerDetail: CustomerDetailPayload = response?.customerDetail || {};
        const {
          partyRoleList,
          party,
          pcaaList,
          partyIdentificationList,
          emailAddressList,
          telecomNumberList,
          postalAddressList,
          payments,
          partyNoteList,
          contentList,
        } = customerDetail;

        this.roles = partyRoleList || [];
        this.customerDetail = party;
        this.partyRoleList = partyRoleList || [];
        this.partyClassifications = pcaaList || [];
        this.partyIdentificationList = partyIdentificationList || [];
        this.emailAddressList = emailAddressList || [];
        this.telecomNumberList = telecomNumberList || [];
        this.postalAddressList = postalAddressList || [];
        this.payments = payments || [];
        this.partyNotes = (partyNoteList || []).map((note): PartyNote => ({
          ...note,
          partyId: note.partyId ?? partyId,
        }));
        this.contents = contentList || [];
        if (showLoader) {
          this.isLoading.set(false);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        if (showLoader) {
          this.isLoading.set(false);
        }
      },
    });
  }

  private refreshCustomerSilently(partyId?: string): void {
    const id = partyId || this.partyId;
    if (!id) {
      return;
    }
    this.getCustomer(id, false);
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

  trackByRole = (_: number, role: Partial<PartyRole> & { partyRoleId?: string; roleType?: string }): string | number =>
    role?.partyRoleId ?? role?.roleTypeId ?? role?.roleType ?? _;

  trackByPayment = (_: number, payment: PartyPaymentSummary): string | number =>
    payment?.paymentMethod?.paymentMethodId ?? payment?.paymentMethodId ?? _;

  filterEmailAddressList(emailAddressList: EmailAddress[], purpose: string): EmailAddress[] {
    return (
      emailAddressList?.filter(
        (email: EmailAddress) => email.contactMechPurposeId === purpose
      ) || []
    );
  }

  filterTelecomNumberList(telecomNumberList: TelecomNumber[], purpose: string): TelecomNumber[] {
    return (
      telecomNumberList?.filter(
        (telecomNumber: TelecomNumber) =>
          telecomNumber.contactMechPurposeId === purpose
      ) || []
    );
  }

  getOverviewPrimaryAddress(): PostalAddress | undefined {
    return this.postalAddressList?.find(
      (address: PostalAddress) => address.contactMechPurposeId === 'PRIMARY_LOCATION'
    );
  }

  editSupplierDialog(): void {
    this.dialog
      .open(EditCustomerComponent, {
        data: {
          customerDetail: this.customerDetail,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result && result.partyId) {
          this.refreshCustomerSilently(result.partyId);
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
          this.refreshCustomerSilently(result.partyId);
        }
      });
  }

  deleteIdentificationDialog(params: Partial<PartyIdentification> & { partyId?: string }): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('CUSTOMER.IDENTIFICATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteIdentification(params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshCustomerSilently(params.partyId);
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
          this.refreshCustomerSilently(result.partyId);
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
          this.refreshCustomerSilently(params.partyId);
        });
      }
    });
  }

  addRoleDialog(params: Partial<PartyRole> | null = null): void {
    const roleData = { ...params, partyId: this.partyId };
    this.dialog
      .open(AddRoleComponent, {
        data: {
          roleData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PartyDialogResult) => {
        if (result && result.partyId) {
          this.refreshCustomerSilently(result.partyId);
        }
      });
  }

  deleteRoleDialog(params: DeleteRolePayload): void {
    const deletePayload = {
      partyId: params?.partyId || this.partyId,
      roleTypeId: params?.roleTypeId || params?.roleType,
    };
    if (!deletePayload.partyId || !deletePayload.roleTypeId) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('CUSTOMER.ROLES'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteRole(deletePayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshCustomerSilently(deletePayload.partyId as string);
        });
      }
    });
  }

  addEditPhoneDialog(params: (Partial<TelecomNumber> & { partyId?: string }) | null = null): void {
    const addEditPhoneData = { ...params, partyId: this.partyId };

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
          this.refreshCustomerSilently(result.partyId);
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
          this.refreshCustomerSilently(result.partyId);
        }
      });
  }

  deleteEmailDialog(params: Partial<EmailAddress> & { partyId?: string }): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.EMAIL'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteEmail(params as import('@ofbiz/models/party.model').PartyContactMechPayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshCustomerSilently(params.partyId);
        });
      }
    });
  }

  deletePhoneDialog(params: Partial<TelecomNumber> & { partyId?: string }): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.PHONE'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deleteContactMech(params as import('@ofbiz/models/party.model').PartyContactMechPayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshCustomerSilently(params.partyId);
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
          this.refreshCustomerSilently(result.partyId);
        }
      });
  }

  deleteAddressDialog(params: Partial<PostalAddress> & { partyId?: string }): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.ADDRESS'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deletePostalAddress(params as import('@ofbiz/models/party.model').PartyContactMechPayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.refreshCustomerSilently(params.partyId);
        });
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
      roleTypeId: 'CUSTOMER',
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
          this.refreshCustomerSilently(result.partyId);
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
      roleTypeId: 'CUSTOMER',
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
          this.refreshCustomerSilently(result.partyId);
        }
      });
  }

  deletePaymentMethodDialog(payment: PartyPaymentSummary): void {
    const paymentMethodId = payment?.paymentMethod?.paymentMethodId ?? payment?.paymentMethodId;
    const partyId = this.partyId;
    if (!paymentMethodId || !partyId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('CUSTOMER.PAYMENT_METHOD'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.partyService.deletePaymentMethod(partyId, String(paymentMethodId))
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.refreshCustomerSilently(partyId);
          });
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
          this.refreshCustomerSilently(result.partyId);
        }
      });
  }

  deleteNoteDialog(params: DeleteNotePayload): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.NOTE'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
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
            this.refreshCustomerSilently(this.partyId);
          }
        });
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
          this.refreshCustomerSilently(result.partyId);
        }
      });
  }

  openPartyContent(item: Partial<PartyContent> | null | undefined): void {
    if (!this.partyId || !item?.contentId) {
      return;
    }
    this.partyService.downloadPartyContent(this.partyId, item.contentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
      },
    });
  }
}
