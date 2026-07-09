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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RequirementDetailComponent } from './requirement-detail.component';
import { RequirementService } from '@ofbiz/services/requirement/requirement.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';

describe('RequirementDetailComponent', () => {
  let component: RequirementDetailComponent;
  let fixture: ComponentFixture<RequirementDetailComponent>;
  let requirementServiceSpy: jasmine.SpyObj<RequirementService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    requirementServiceSpy = jasmine.createSpyObj('RequirementService', ['getRequirementDetail', 'approveRequirement', 'upsertSupplier']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [RequirementDetailComponent],
      providers: [
        { provide: RequirementService, useValue: requirementServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: MatDialog, useValue: dialogSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '100',
              },
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(RequirementDetailComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RequirementDetailComponent);
    component = fixture.componentInstance;
  });

  it('maps requirement status history and helpers for the status icon', fakeAsync(() => {
    requirementServiceSpy.getRequirementDetail.and.returnValue(of({
      requirement: {
        requirementId: 'REQ100',
        statusId: 'REQ_PROPOSED',
        requirementTypeId: 'PRODUCT_REQUIREMENT',
      },
      requirementTypeDescription: '',
      statusHistory: [
        { statusId: 'REQ_PROPOSED', statusDate: '2026-04-07T08:00:00' },
        { statusId: 'REQ_APPROVED', statusDate: '2026-04-07T09:30:00' },
        { statusDate: '2026-04-07T09:45:00' },
      ],
      references: [
        { referenceType: 'PRODUCTION_RUN', referenceId: 'JOB1' },
        { referenceType: 'PURCHASE_ORDER', referenceId: 'PO1' },
        { referenceType: 'OTHER', referenceId: 'X' },
      ],
      facilityDisplay: 'Main Facility',
      productDisplay: 'Widget A',
      supplier: {
        partyId: 'SUP1',
        partyName: 'Supplier One',
        displayLabel: 'Supplier One Label',
        address: 'Supplier St',
      },
    }));

    fixture.detectChanges();
    tick();

    expect(requirementServiceSpy.getRequirementDetail).toHaveBeenCalledWith('100');
    expect(component.detail).toBeTruthy();
    expect(component.hasSupplier()).toBeTrue();
    expect(component.canApprove()).toBeTrue();
    expect(component.getTypeLabel()).toBe('REQUIREMENT.TYPE_PRODUCT');
    expect(component.getStatusLabel()).toBe('REQUIREMENT.STATUS_PROPOSED');
    expect(component.getReferenceTypeLabel('PRODUCTION_RUN')).toBe('REQUIREMENT.REF_PRODUCTION_RUN');
    expect(component.getReferenceTypeLabel('PURCHASE_ORDER')).toBe('REQUIREMENT.REF_PURCHASE_ORDER');
    expect(component.getReferenceTypeLabel('OTHER')).toBe('OTHER');
    expect(component.getReferenceLink({ referenceType: 'PRODUCTION_RUN', referenceId: 'JOB1' })).toEqual(['/jobs', 'JOB1']);
    expect(component.getReferenceLink({ referenceType: 'PURCHASE_ORDER', referenceId: 'PO1' })).toEqual(['/pos', 'PO1']);
    expect(component.getReferenceLink({ referenceType: 'OTHER', referenceId: 'X' })).toEqual(['/requirements']);
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'REQ_PROPOSED',
        statusLabel: 'REQUIREMENT.STATUS_PROPOSED',
        changedAt: '2026-04-07T08:00:00',
      }),
      jasmine.objectContaining({
        statusId: 'REQ_APPROVED',
        statusLabel: 'REQUIREMENT.STATUS_APPROVED',
        changedAt: '2026-04-07T09:30:00',
      }),
    ]);
    expect(component.facilityLabel).toBe('Main Facility');
    expect(component.productLabel).toBe('Widget A');
    expect(component.supplierLabel).toBe('Supplier One Label');
    expect(component.supplierAddress).toBe('Supplier St');
    expect(component.selectedSupplierPartyId).toBe('SUP1');
  }));

  it('shows an error and clears history when load fails', fakeAsync(() => {
    requirementServiceSpy.getRequirementDetail.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('REQUIREMENT.LOAD_ERROR');
    expect(component.statusHistoryEntries()).toEqual([]);
  }));

  it('covers load guards and status/type fallback branches', () => {
    component.requirementId = '';
    component.loadDetail();
    expect(requirementServiceSpy.getRequirementDetail).not.toHaveBeenCalled();

    component.detail = {};
    component.requirement = {
      statusId: 'REQ_UNKNOWN',
      requirementTypeId: 'MISC_REQUIREMENT',
    };

    expect(component.getStatusLabel()).toBe('REQ_UNKNOWN');
    expect(component.getTypeLabel()).toBe('MISC_REQUIREMENT');
    expect((component as any).getStatusDisplay(undefined)).toBe('-');
    expect((component as any).getStatusDisplay('REQ_PROPOSED')).toBe('REQUIREMENT.STATUS_PROPOSED');
    expect((component as any).getStatusDisplay('REQ_APPROVED')).toBe('REQUIREMENT.STATUS_APPROVED');
    expect((component as any).getStatusDisplay('REQ_ORDERED')).toBe('REQUIREMENT.STATUS_ORDERED');
    expect((component as any).getStatusDisplay('REQ_COMPLETED')).toBe('COMMON.COMPLETED');
    expect(component.getReferenceTypeLabel('')).toBe('-');
    expect(component.canApprove()).toBeTrue();

    component.requirement.statusId = 'REQ_APPROVED';
    expect(component.canApprove()).toBeFalse();
    component.requirement.statusId = 'REQ_ORDERED';
    expect(component.canApprove()).toBeFalse();
    component.requirement.statusId = 'REQ_COMPLETED';
    expect(component.canApprove()).toBeFalse();
  });

  it('covers approve and supplier dialog branches', fakeAsync(() => {
    requirementServiceSpy.getRequirementDetail.and.returnValue(of({
      requirement: {
        requirementId: 'REQ100',
        statusId: 'REQ_PROPOSED',
      },
      supplier: {
        partyId: 'SUP1',
        displayLabel: 'Supplier One Label',
      },
      statusHistory: [],
    }));
    requirementServiceSpy.approveRequirement.and.returnValues(
      of({}),
      throwError(() => new Error('approve failed'))
    );
    requirementServiceSpy.upsertSupplier.and.returnValues(
      of({}),
      throwError(() => new Error('supplier failed'))
    );
    spyOn(component, 'loadDetail').and.stub();

    dialogSpy.open.and.returnValue({
      afterClosed: () => of({
        supplierPartyId: ' SUP2 ',
        supplierPartyName: ' Supplier Two ',
      }),
    } as any);

    fixture.detectChanges();
    tick();

    component.approve();
    expect(requirementServiceSpy.approveRequirement).toHaveBeenCalledWith('100', {});
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('REQUIREMENT.APPROVE_SUCCESS');
    expect(component.loadDetail).toHaveBeenCalledWith(false);

    component.approve();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('REQUIREMENT.APPROVE_ERROR');

    component.openSupplierDialog();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(requirementServiceSpy.upsertSupplier).toHaveBeenCalledWith('100', {
      partyId: 'SUP2',
      partyName: 'Supplier Two',
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('COMMON.SAVE_SUCCESS');
    expect(component.loadDetail).toHaveBeenCalledWith(false);

    dialogSpy.open.and.returnValue({
      afterClosed: () => of({ supplierPartyId: '   ' }),
    } as any);
    component.openSupplierDialog();
    expect(requirementServiceSpy.upsertSupplier).toHaveBeenCalledTimes(1);
  }));

  it('covers supplier dialog error branch and empty dialog result guard', fakeAsync(() => {
    requirementServiceSpy.getRequirementDetail.and.returnValue(of({
      requirement: {
        requirementId: 'REQ100',
        statusId: 'REQ_PROPOSED',
      },
      supplier: {
        partyId: 'SUP1',
        displayLabel: 'Supplier One Label',
      },
      statusHistory: [],
    }));
    requirementServiceSpy.approveRequirement.and.returnValue(of({}));
    requirementServiceSpy.upsertSupplier.and.returnValue(throwError(() => new Error('supplier failed')));
    spyOn(component, 'loadDetail').and.stub();
    spyOn(console, 'error');

    fixture.detectChanges();
    tick();

    dialogSpy.open.and.returnValue({
      afterClosed: () => of({
        supplierPartyId: 'SUP2',
        supplierPartyName: 'Supplier Two',
      }),
    } as any);
    component.openSupplierDialog();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('REQUIREMENT.SUPPLIER_SAVE_ERROR');
    expect(component.loadDetail).not.toHaveBeenCalledWith(false);

    dialogSpy.open.and.returnValue({
      afterClosed: () => of({ supplierPartyId: '   ' }),
    } as any);
    component.openSupplierDialog();
    expect(requirementServiceSpy.upsertSupplier).toHaveBeenCalledTimes(1);
  }));

  it('guards approve and supplier dialog actions when ids are missing or dialog result is empty', () => {
    component.requirementId = '';
    component.approve();
    expect(requirementServiceSpy.approveRequirement).not.toHaveBeenCalled();

    component.requirementId = '100';
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(null),
    } as any);
    component.openSupplierDialog();
    expect(requirementServiceSpy.upsertSupplier).not.toHaveBeenCalled();
  });

  it('covers status history filtering and approve no-op branch on missing id', fakeAsync(() => {
    requirementServiceSpy.getRequirementDetail.and.returnValue(of({
      requirement: {
        requirementId: 'REQ300',
        statusId: 'REQ_PROPOSED',
      },
      statusHistory: [
        { statusId: 'REQ_ORDERED', statusDate: '2026-04-08T10:00:00' },
        { statusDate: '2026-04-08T10:30:00' },
      ],
    }));

    fixture.detectChanges();
    tick();

    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'REQ_ORDERED',
        statusLabel: 'REQUIREMENT.STATUS_ORDERED',
      }),
    ]);

    component.requirementId = '';
    component.approve();
    expect(requirementServiceSpy.approveRequirement).not.toHaveBeenCalledWith('', {});
  }));

  it('creates purchase order on success', fakeAsync(() => {
    component.requirementId = 'REQ100';
    requirementServiceSpy.upsertSupplier = jasmine.createSpy('upsertSupplier').and.returnValue(of({}));
    requirementServiceSpy.createPurchaseOrder = jasmine.createSpy('createPurchaseOrder').and.returnValue(of({ id: 'PO100' }));
    spyOn(component, 'hasSupplier').and.returnValue(true);
    const loadSpy = spyOn(component, 'loadDetail');

    component.createPurchaseOrder();
    tick();

    expect(requirementServiceSpy.createPurchaseOrder).toHaveBeenCalledWith('REQ100');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('REQUIREMENT.CREATE_PO_SUCCESS');
    expect(loadSpy).toHaveBeenCalledWith(false);
  }));

  it('handles error on create purchase order failure', fakeAsync(() => {
    component.requirementId = 'REQ100';
    requirementServiceSpy.createPurchaseOrder = jasmine.createSpy('createPurchaseOrder').and.returnValue(throwError(() => ({
      error: { message: 'Failed to create PO' }
    })));
    spyOn(component, 'hasSupplier').and.returnValue(true);

    component.createPurchaseOrder();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Failed to create PO');
  }));

  it('creates manufacturing job on success', fakeAsync(() => {
    component.requirementId = 'REQ100';
    requirementServiceSpy.createJob = jasmine.createSpy('createJob').and.returnValue(of({ id: 'JOB100' }));
    const loadSpy = spyOn(component, 'loadDetail');

    component.createJob();
    tick();

    expect(requirementServiceSpy.createJob).toHaveBeenCalledWith('REQ100');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('REQUIREMENT.CREATE_JOB_SUCCESS');
    expect(loadSpy).toHaveBeenCalledWith(false);
  }));

  it('handles error on create manufacturing job failure', fakeAsync(() => {
    component.requirementId = 'REQ100';
    requirementServiceSpy.createJob = jasmine.createSpy('createJob').and.returnValue(throwError(() => ({
      error: { message: 'Failed to create job' }
    })));

    component.createJob();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Failed to create job');
  }));

  it('verifies getReferenceLink and getReferenceTypeLabel logic', () => {
    expect(component.getReferenceLink({ referenceType: 'PRODUCTION_RUN', referenceId: '100' })).toEqual(['/jobs', '100']);
    expect(component.getReferenceLink({ referenceType: 'PURCHASE_ORDER', referenceId: '200' })).toEqual(['/pos', '200']);
    expect(component.getReferenceLink({ referenceType: 'OTHER' })).toEqual(['/requirements']);

    expect(component.getReferenceTypeLabel('PRODUCTION_RUN')).toBe('REQUIREMENT.REF_PRODUCTION_RUN');
    expect(component.getReferenceTypeLabel('PURCHASE_ORDER')).toBe('REQUIREMENT.REF_PURCHASE_ORDER');
    expect(component.getReferenceTypeLabel('OTHER')).toBe('OTHER');
    expect(component.getReferenceTypeLabel(null as any)).toBe('-');
  });
});
