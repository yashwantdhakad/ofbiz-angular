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
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { JobDetailComponent } from './job-detail.component';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { TimesheetService } from '@ofbiz/services/timesheet/timesheet.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ConfirmationDialogComponent } from '../../../common/confirmation-dialog/confirmation-dialog.component';
import { AddJobContentDialogComponent } from '../add-job-content-dialog/add-job-content-dialog.component';
import { JobAssignWorkerDialogComponent } from './job-assign-worker-dialog.component';
import { ProduceItemComponent } from '../../produce-item/produce-item.component';
import { ConsumableItemComponent } from '../../consumable-item/consumable-item.component';
import { SetConsumableInventoryDialogComponent } from '../set-consumable-inventory-dialog/set-consumable-inventory-dialog.component';
import { JobDetailResponse } from '@ofbiz/models/manufacturing.model';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CompleteTaskDialogComponent } from './complete-task-dialog.component';
import { JobNoteDialogComponent } from './job-note-dialog.component';

describe('JobDetailComponent', () => {
  let component: JobDetailComponent;
  let fixture: ComponentFixture<JobDetailComponent>;
  let manufacturingServiceSpy: jasmine.SpyObj<ManufacturingService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;
  let timesheetServiceSpy: jasmine.SpyObj<TimesheetService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(JobDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function successfulJobResponse(overrides: Partial<JobDetailResponse> = {}): JobDetailResponse {
    return {
      job: {
        workEffortId: 'JOB123',
        currentStatusId: 'PRUN_DOC_PRINTED',
        assignedWorkerPartyId: 'WORKER1',
        assignedWorkerName: 'Worker One',
        facilityId: 'FAC1',
      },
      consumeList: [
        { id: 11, productId: 'COMP1', remainingQuantity: 5, statusId: 'WEGS_CREATED' },
        { id: 12, productId: 'COMP2', reservedQuantity: 2, statusId: 'WEGS_RESERVED' },
      ],
      produceList: [{ productId: 'PROD1', estimatedQuantity: '8', produced: '3' }],
      tasks: [{ taskId: 'TASK1' }],
      references: [{ id: 'REF1' }],
      producedItems: [{ inventoryItemId: 'INV1', producedInventoryItemIds: 'A1, B2' }],
      issuedMaterials: [{ itemIssuanceId: 'ISSUE1', statusId: 'WEGS_ISSUED' }],
      contents: [{ id: 22, contentId: 'CONT1' }],
      statusHistory: [
        { statusId: 'PRUN_CREATED', statusDatetime: '2026-04-08T10:00:00Z', setByUserLogin: 'admin', reason: 'Created' },
        { statusId: 'PRUN_DOC_PRINTED', statusDatetime: '2026-04-08T11:00:00Z', setByUserLogin: 123 as any, reason: null as any },
      ],
      ...overrides,
    } as JobDetailResponse;
  }

  beforeEach(async () => {
    manufacturingServiceSpy = jasmine.createSpyObj<ManufacturingService>('ManufacturingService', [
      'getJob',
      'approveJob',
      'startJob',
      'completeJob',
      'closeJob',
      'assignJobWorker',
      'getJobCardPdf',
      'addJobExecutionChecklist',
      'listJobExecutionChecklist',
      'reserveConsumable',
      'releaseConsumable',
      'issueConsumable',
      'bulkReserveConsumables',
      'bulkIssueConsumables',
      'cancelConsumable',
      'addJobContent',
      'deleteJobContent',
      'downloadJobContent',
      'returnIssuedMaterial',
      'deleteJobNote',
      'getJobCosts',
      'addJobCost',
      'deleteJobCost',
      'startJobTask',
      'completeJobTask',
    ]);
    manufacturingServiceSpy.getJob.and.returnValue(of(successfulJobResponse()));
    manufacturingServiceSpy.approveJob.and.returnValue(of({}));
    manufacturingServiceSpy.startJob.and.returnValue(of({}));
    manufacturingServiceSpy.completeJob.and.returnValue(of({}));
    manufacturingServiceSpy.closeJob.and.returnValue(of({}));
    manufacturingServiceSpy.assignJobWorker.and.returnValue(of({}));
    manufacturingServiceSpy.getJobCardPdf.and.returnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    manufacturingServiceSpy.addJobExecutionChecklist.and.returnValue(of({
      id: 101,
      category: 'QA',
      statusId: 'QA_PASSED',
      quantity: '1',
      note: 'Accepted',
    }));
    manufacturingServiceSpy.listJobExecutionChecklist.and.returnValue(of([]));
    manufacturingServiceSpy.reserveConsumable.and.returnValue(of({}));
    manufacturingServiceSpy.releaseConsumable.and.returnValue(of({}));
    manufacturingServiceSpy.issueConsumable.and.returnValue(of({}));
    manufacturingServiceSpy.bulkReserveConsumables.and.returnValue(of({}));
    manufacturingServiceSpy.bulkIssueConsumables.and.returnValue(of({}));
    manufacturingServiceSpy.cancelConsumable.and.returnValue(of({}));
    manufacturingServiceSpy.addJobContent.and.returnValue(of({}));
    manufacturingServiceSpy.deleteJobContent.and.returnValue(of({}));
    manufacturingServiceSpy.downloadJobContent.and.returnValue(of(new Blob(['content'], { type: 'text/plain' })));
    manufacturingServiceSpy.returnIssuedMaterial.and.returnValue(of({}));
    manufacturingServiceSpy.deleteJobNote.and.returnValue(of({}));
    manufacturingServiceSpy.getJobCosts.and.returnValue(of({
      materialCostLines: [], laborCostLines: [], miscCostLines: [],
      materialCostTotal: 0, laborCostTotal: 0, miscCostTotal: 0, totalCost: 0,
    } as any));
    manufacturingServiceSpy.addJobCost.and.returnValue(of({}));
    manufacturingServiceSpy.deleteJobCost.and.returnValue(of({}));
    manufacturingServiceSpy.startJobTask.and.returnValue(of({}));
    manufacturingServiceSpy.completeJobTask.and.returnValue(of({}));
    timesheetServiceSpy = jasmine.createSpyObj<TimesheetService>('TimesheetService', ['listEntriesByWorkEffort']);
    timesheetServiceSpy.listEntriesByWorkEffort.and.returnValue(of([]));

    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(null),
    } as any);

    renderSchedulerSpy = jasmine.createSpyObj<RenderSchedulerService>('RenderSchedulerService', [
      'deferMacrotask',
      'defer',
      'markForCheck',
      'detectChanges',
    ]);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.defer.and.callFake((fn: () => void) => fn());
    translateSpy = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => `translated:${key}`);
    snackbarSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      declarations: [JobDetailComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingServiceSpy },
        { provide: TimesheetService, useValue: timesheetServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: PartyService, useValue: jasmine.createSpyObj('PartyService', ['getParty']) },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ workEffortId: 'JOB123' }),
            snapshot: { params: { workEffortId: 'JOB123' } },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(JobDetailComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('loads the job detail and maps status history', () => {
    createComponent();

    expect(manufacturingServiceSpy.getJob).toHaveBeenCalledWith('JOB123');
    expect(component.workEffortId).toBe('JOB123');
    expect(component.jobDetail().workEffortId).toBe('JOB123');
    expect(component.productsToConsume()).toHaveSize(2);
    expect(component.productsToProduce()).toHaveSize(1);
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'PRUN_CREATED',
        statusLabel: 'Created',
        changedAt: '2026-04-08T10:00:00Z',
        changedBy: 'admin',
        reason: 'Created',
      }),
      jasmine.objectContaining({
        statusLabel: 'Confirmed',
        changedBy: null,
        reason: null,
      }),
    ]);
  });

  it('clears state when the job fetch fails', () => {
    manufacturingServiceSpy.getJob.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    expect(component.jobDetail()).toEqual({});
    expect(component.productsToConsume()).toEqual([]);
    expect(component.statusHistoryEntries()).toEqual([]);
  });

  it('covers sparse job mapping, error handling, and loader suppression', () => {
    manufacturingServiceSpy.getJob.and.returnValue(of({
      job: {
        workEffortId: 'JOB999',
        currentStatusId: null as any,
        estimatedMilliSeconds: '3600',
      },
      consumeList: null as any,
      produceList: null as any,
      tasks: null as any,
      references: null as any,
      producedItems: null as any,
      issuedMaterials: null as any,
      contents: null as any,
      statusHistory: [{ statusId: 'PRUN_CREATED', statusDatetime: 123 as any, setByUserLogin: null as any, reason: 77 as any }],
    } as JobDetailResponse));
    createComponent();

    expect(component.jobDetail().estimatedWorkDuration).toBe('3600');
    expect(component.statusHistoryEntries()[0]).toEqual(jasmine.objectContaining({
      statusId: 'PRUN_CREATED',
      statusLabel: 'Created',
      changedAt: null,
      changedBy: null,
      reason: null,
    }));

    manufacturingServiceSpy.getJob.and.returnValue(throwError(() => new Error('reload failed')));
    component.fetchJobDetail('JOB999', false);
    expect(component.isLoading()).toBeFalse();
    expect(component.productsToProduce()).toEqual([]);
  });

  it('resets work effort data when the route has no id', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        params: of({}),
        snapshot: { params: {} },
      },
    });

    fixture = TestBed.createComponent(JobDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(manufacturingServiceSpy.getJob).not.toHaveBeenCalled();
    expect(component.workEffortId).toBeUndefined();
  });

  it('guards workflow actions when the work effort id is missing', () => {
    createComponent();
    component.workEffortId = undefined;

    component.approveJob();
    component.startJob();
    component.completeJob();
    component.closeJob();
    component.openAssignWorkerDialog();
    component.reserveConsumable({ id: 1 } as any);
    component.setInventory({ id: 1 } as any);
    component.releaseConsumable({ id: 1 } as any);
    component.issueConsumable({ id: 1 } as any);
    component.bulkReserveConsumables();
    component.bulkIssueConsumables();
    component.cancelConsumable({ id: 1 } as any);
    component.openAddContentDialog();
    component.removeContent({ id: 1 } as any);
    component.openContent({ contentId: 'CONT1' } as any);

    expect(manufacturingServiceSpy.approveJob).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.startJob).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.completeJob).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.closeJob).not.toHaveBeenCalled();
    expect(dialogSpy.open).not.toHaveBeenCalledWith(JobAssignWorkerDialogComponent, jasmine.anything());
  });

  it('covers no-op guards and action failures for assign, bulk, content, and consumable flows', fakeAsync(() => {
    createComponent();
    dialogSpy.open.calls.reset();
    manufacturingServiceSpy.assignJobWorker.calls.reset();
    manufacturingServiceSpy.bulkReserveConsumables.calls.reset();
    manufacturingServiceSpy.bulkIssueConsumables.calls.reset();
    manufacturingServiceSpy.cancelConsumable.calls.reset();
    manufacturingServiceSpy.addJobContent.calls.reset();
    manufacturingServiceSpy.deleteJobContent.calls.reset();
    manufacturingServiceSpy.downloadJobContent.calls.reset();

    component.workEffortId = undefined;
    component.openAssignWorkerDialog();
    component.addConsumable();
    component.produceItem({} as any);
    component.setInventory({} as any);
    component.releaseConsumable({} as any);
    component.issueConsumable({} as any);
    component.bulkReserveConsumables();
    component.bulkIssueConsumables();
    component.cancelConsumable({} as any);
    component.openAddContentDialog();
    component.removeContent({} as any);
    component.openContent({} as any);

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.assignJobWorker).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.bulkReserveConsumables).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.bulkIssueConsumables).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.cancelConsumable).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.addJobContent).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.deleteJobContent).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.downloadJobContent).not.toHaveBeenCalled();

    component.workEffortId = 'JOB123';
    component.jobDetail.set({ currentStatusId: 'PRUN_DOC_PRINTED', assignedWorkerPartyId: 'WORKER1', assignedWorkerName: '' } as any);
    component.isBulkReserveLoading.set(true);
    component.isBulkIssueLoading.set(true);
    component.productsToConsume.set([{ id: 11, productId: 'COMP1', remainingQuantity: 5, statusId: 'WEGS_CREATED' } as any]);
    component.openAssignWorkerDialog();
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(JobAssignWorkerDialogComponent);

    dialogSpy.open.and.returnValue({ afterClosed: () => of({}) } as any);
    component.openAssignWorkerDialog();
    expect(manufacturingServiceSpy.assignJobWorker).not.toHaveBeenCalled();

    manufacturingServiceSpy.assignJobWorker.and.returnValue(throwError(() => new Error('assign failed')));
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ partyId: 'WORKER2' }) } as any);
    component.openAssignWorkerDialog();
    expect(manufacturingServiceSpy.assignJobWorker).toHaveBeenCalledWith('JOB123', 'WORKER2');

    component.isBulkReserveLoading.set(false);
    component.isBulkIssueLoading.set(false);
    component.productsToConsume.set([]);
    component.bulkReserveConsumables();
    component.bulkIssueConsumables();
    expect(manufacturingServiceSpy.bulkReserveConsumables).not.toHaveBeenCalled();
    expect(manufacturingServiceSpy.bulkIssueConsumables).not.toHaveBeenCalled();

    component.productsToConsume.set([
      { id: 11, productId: 'COMP1', remainingQuantity: 5, statusId: 'WEGS_CREATED' } as any,
      { id: 12, productId: 'COMP2', reservedQuantity: 2, statusId: 'WEGS_RESERVED' } as any,
    ]);
    expect(component.canBulkReserve()).toBeTrue();
    component.bulkReserveConsumables();
    component.jobDetail.set({ currentStatusId: 'PRUN_RUNNING' } as any);
    expect(component.canBulkIssue()).toBeTrue();
    component.bulkIssueConsumables();
    expect(manufacturingServiceSpy.bulkReserveConsumables).toHaveBeenCalledWith('JOB123', {});
    expect(manufacturingServiceSpy.issueConsumable).toHaveBeenCalledWith('JOB123', 12, {});

    component.jobDetail.set({ currentStatusId: 'PRUN_CREATED' } as any);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
    component.cancelConsumable({ id: 11 } as any);
    expect(dialogSpy.open.calls.mostRecent().args[1]?.data).toEqual({
      title: 'translated:MANUFACTURING.CANCEL_CONSUMABLE_TITLE',
      message: 'translated:MANUFACTURING.CANCEL_CONSUMABLE_MESSAGE',
    });
    expect(manufacturingServiceSpy.cancelConsumable).not.toHaveBeenCalledWith('JOB123', 11);

    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    manufacturingServiceSpy.cancelConsumable.and.returnValue(throwError(() => new Error('cancel failed')));
    component.cancelConsumable({ id: 11 } as any);
    expect(manufacturingServiceSpy.cancelConsumable).toHaveBeenCalledWith('JOB123', 11);

    dialogSpy.open.and.returnValue({ afterClosed: () => of({ formData: { contentName: 'Doc' }, workEffortContentTypeId: 'DOCUMENT' }) } as any);
    manufacturingServiceSpy.addJobContent.and.returnValue(throwError(() => new Error('add failed')));
    component.openAddContentDialog();
    expect(manufacturingServiceSpy.addJobContent).toHaveBeenCalledWith('JOB123', jasmine.anything(), 'DOCUMENT');

    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    manufacturingServiceSpy.deleteJobContent.and.returnValue(throwError(() => new Error('delete failed')));
    component.removeContent({ id: 22, contentId: 'CONT22' } as any);
    expect(dialogSpy.open.calls.mostRecent().args[1]?.data).toEqual({
      title: 'translated:MANUFACTURING.DELETE_CONTENT_TITLE',
      message: 'translated:MANUFACTURING.DELETE_CONTENT_MESSAGE',
    });
    expect(manufacturingServiceSpy.deleteJobContent).toHaveBeenCalledWith('JOB123', 'CONT22');

    manufacturingServiceSpy.downloadJobContent.and.returnValue(throwError(() => new Error('download failed')));
    component.openContent({ contentId: 'CONT1' } as any);
    tick();
  }));

  it('drives approve, start, complete, close, and assign worker flows', () => {
    createComponent();
    manufacturingServiceSpy.getJob.calls.reset();
    dialogSpy.open.calls.reset();
    manufacturingServiceSpy.approveJob.calls.reset();
    manufacturingServiceSpy.startJob.calls.reset();
    manufacturingServiceSpy.completeJob.calls.reset();
    manufacturingServiceSpy.closeJob.calls.reset();
    manufacturingServiceSpy.assignJobWorker.calls.reset();

    component.approveJob();
    component.startJob();
    component.completeJob();
    component.closeJob();

    expect(manufacturingServiceSpy.approveJob).toHaveBeenCalledWith('JOB123');
    expect(manufacturingServiceSpy.startJob).toHaveBeenCalledWith('JOB123');
    expect(manufacturingServiceSpy.completeJob).toHaveBeenCalledWith('JOB123');
    expect(manufacturingServiceSpy.closeJob).toHaveBeenCalledWith('JOB123');

    dialogSpy.open.and.returnValue({
      afterClosed: () => of({ partyId: 'WORKER2' }),
    } as any);
    component.openAssignWorkerDialog();

    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(JobAssignWorkerDialogComponent);
    expect(manufacturingServiceSpy.assignJobWorker).toHaveBeenCalledWith('JOB123', 'WORKER2');
  });

  it('adds a job execution checklist entry', () => {
    createComponent();
    manufacturingServiceSpy.addJobExecutionChecklist.calls.reset();

    component.executionChecklistForm.setValue({
      category: 'QA',
      statusId: 'QA_PASSED',
      quantity: '2',
      note: 'Accepted at final inspection',
    });
    component.submitExecutionChecklist();

    expect(manufacturingServiceSpy.addJobExecutionChecklist).toHaveBeenCalledWith('JOB123', {
      category: 'QA',
      statusId: 'QA_PASSED',
      quantity: '2',
      note: 'Accepted at final inspection',
    });
    expect(component.executionChecklist()[0]).toEqual(jasmine.objectContaining({ statusId: 'QA_PASSED' }));
    expect(component.checklistLabel('REWORK_REQUIRED')).toBe('REWORK REQUIRED');
  });

  it('covers consumable and content dialog branches', fakeAsync(() => {
    createComponent();
    dialogSpy.open.calls.reset();

    component.jobDetail.set({ currentStatusId: 'PRUN_CREATED' } as any);
    component.addConsumable();
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(ConsumableItemComponent);

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true),
    } as any);
    component.jobDetail.set({ currentStatusId: 'PRUN_RUNNING' } as any);
    component.produceItem(component.productsToProduce()[0]);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(ProduceItemComponent);

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true),
    } as any);
    component.jobDetail.set({ currentStatusId: 'PRUN_DOC_PRINTED' } as any);
    component.setInventory(component.productsToConsume()[0]);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(SetConsumableInventoryDialogComponent);

    component.reserveConsumable(component.productsToConsume()[0]);
    component.releaseConsumable(component.productsToConsume()[0]);
    component.jobDetail.set({ currentStatusId: 'PRUN_RUNNING' } as any);
    component.issueConsumable(component.productsToConsume()[0]);

    expect(manufacturingServiceSpy.reserveConsumable).toHaveBeenCalledWith('JOB123', 11, {});
    expect(manufacturingServiceSpy.releaseConsumable).toHaveBeenCalledWith('JOB123', 11, {});
    expect(manufacturingServiceSpy.issueConsumable).toHaveBeenCalledWith('JOB123', 11, {});

    component.selectedIssuedMaterialIds.add('ISSUE1');
    component.returnQtyByIssuanceId['ISSUE1'] = '2';
    component.returnReasonByIssuanceId['ISSUE1'] = 'IRR_DAMAGED';
    component.returnIssuedMaterials();
    expect(manufacturingServiceSpy.returnIssuedMaterial).toHaveBeenCalledWith('JOB123', {
      itemIssuanceId: 'ISSUE1',
      quantity: '2',
      reasonEnumId: 'IRR_DAMAGED',
    });

    dialogSpy.open.and.returnValue({
      afterClosed: () => of({ formData: { contentName: 'Doc' }, workEffortContentTypeId: 'DOCUMENT' }),
    } as any);
    component.openAddContentDialog();
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(AddJobContentDialogComponent);
    expect(manufacturingServiceSpy.addJobContent).toHaveBeenCalledWith(
      'JOB123',
      jasmine.objectContaining({ contentName: 'Doc' } as any) as any,
      'DOCUMENT'
    );

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true),
    } as any);
    component.removeContent({ id: 22, contentId: 'CONT22' } as any);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(ConfirmationDialogComponent);
    expect(manufacturingServiceSpy.deleteJobContent).toHaveBeenCalledWith('JOB123', 'CONT22');

    const openSpy = spyOn(window, 'open').and.stub();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:job-content');
    spyOn(URL, 'revokeObjectURL').and.stub();
    component.openContent({ contentId: 'CONT1' } as any);
    tick(10000);
    expect(manufacturingServiceSpy.downloadJobContent).toHaveBeenCalledWith('JOB123', 'CONT1');
    expect(openSpy).toHaveBeenCalledWith('blob:job-content', '_blank', 'noopener');
  }));

  it('handles bulk consume branches and exposes helpers', () => {
    createComponent();
    manufacturingServiceSpy.bulkReserveConsumables.calls.reset();
    manufacturingServiceSpy.bulkIssueConsumables.calls.reset();
    component.productsToConsume.set([
      { id: 11, productId: 'COMP1', remainingQuantity: 5, statusId: 'WEGS_CREATED' } as any,
      { id: 12, productId: 'COMP2', reservedQuantity: 2, statusId: 'WEGS_RESERVED' } as any,
    ]);

    expect(component.canBulkReserve()).toBeTrue();
    expect(component.canBulkIssue()).toBeFalse();

    component.bulkReserveConsumables();
    expect(manufacturingServiceSpy.bulkReserveConsumables).toHaveBeenCalledWith('JOB123', {});

    component.productsToConsume.set([
      { id: 12, productId: 'COMP2', reservedQuantity: 2, statusId: 'WEGS_RESERVED' } as any,
    ]);
    component.jobDetail.set({ currentStatusId: 'PRUN_RUNNING' } as any);
    expect(component.canBulkIssue()).toBeTrue();
    component.bulkIssueConsumables();
    expect(manufacturingServiceSpy.issueConsumable).toHaveBeenCalledWith('JOB123', 12, {});

    expect(component.statusLabel('PRUN_DOC_PRINTED')).toBe('Confirmed');
    expect(component.statusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN STATUS');
    expect(component.statusLabel()).toBe('');
    expect(component.getAssignedWorkerName()).toBe('Worker One');
    component.jobDetail.set({ currentStatusId: 'PRUN_DOC_PRINTED' } as any);
    expect(component.getAssignedWorkerName()).toBe('');
    expect(component.getReferenceLink({ id: 'JOB456' } as any)).toEqual(['/jobs', 'JOB456']);
    expect(component.getProducedInventoryItemIds({ producedInventoryItemIds: 'A1, B2,,' } as any)).toEqual(['A1', 'B2']);
    expect(component.getRemainingConsumableQty({ estimatedQuantity: '5', issuedQuantity: '2' } as any)).toBe(3);
    expect(component.isApproved()).toBeTrue();
    expect(component.isCompleted()).toBeFalse();
    expect(component.canReturnIssuedMaterials()).toBeFalse();
    expect(component.issuedMaterialColumns()).not.toContain('select');
    expect(component.hasRemainingToProduce({ estimatedQuantity: '4', produced: '4' } as any)).toBeFalse();
    expect(component.hasRemainingToProduce({ estimatedQuantity: '4', produced: '1' } as any)).toBeTrue();
    expect(component.getRemainingConsumableQty({ remainingQuantity: '7', estimatedQuantity: '5', issuedQuantity: '2' } as any)).toBe(7);
    expect(component.getRemainingConsumableQty({ estimatedQuantity: '2', issuedQuantity: '5' } as any)).toBe(0);
    expect((component as any).isBulkReserveEligible(null)).toBeFalse();
    expect((component as any).isBulkIssueEligible(null)).toBeFalse();
    expect(component.isClosed()).toBeFalse();

    component.jobDetail.set({ currentStatusId: 'PRUN_COMPLETED' } as any);
    expect(component.isCompleted()).toBeTrue();
    expect(component.canReturnIssuedMaterials()).toBeTrue();
    expect(component.issuedMaterialColumns()).toContain('select');
    expect(component.issuedMaterialColumns()).toContain('qtyToReturn');
    expect(component.issuedMaterialColumns()).toContain('reason');

    component.jobDetail.set({ currentStatusId: 'PRUN_CLOSED' } as any);
    expect(component.canReturnIssuedMaterials()).toBeFalse();
    expect(component.issuedMaterialColumns()).not.toContain('select');
    expect(component.issuedMaterialColumns()).not.toContain('qtyToReturn');
    expect(component.issuedMaterialColumns()).not.toContain('reason');
  });

  it('covers job cost load, remove, and error branches', () => {
    createComponent();
    manufacturingServiceSpy.getJobCosts.calls.reset();

    component.loadJobCosts('');
    expect(component.jobCosts()).toBeNull();

    manufacturingServiceSpy.getJobCosts.and.returnValue(throwError(() => new Error('cost load failed')));
    component.loadJobCosts('JOB123');

    expect(component.jobCosts()).toBeNull();
    expect(component.isCostsLoading()).toBeFalse();

    manufacturingServiceSpy.deleteJobCost.and.returnValue(of({}));
    manufacturingServiceSpy.getJobCosts.and.returnValue(of({ totalCost: 42 } as any));
    component.workEffortId = 'JOB123';
    component.removeJobCost(5);

    expect(manufacturingServiceSpy.deleteJobCost).toHaveBeenCalledWith('JOB123', 5);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('Cost removed');
    expect(component.jobCosts()).toEqual({ totalCost: 42 } as any);

    manufacturingServiceSpy.deleteJobCost.and.returnValue(throwError(() => new Error('delete cost failed')));
    component.removeJobCost(5);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('translated:COMMON.ERROR');

    component.workEffortId = undefined;
    manufacturingServiceSpy.deleteJobCost.calls.reset();
    component.removeJobCost(5);
    expect(manufacturingServiceSpy.deleteJobCost).not.toHaveBeenCalled();
  });

  it('covers note dialog, delete note, and note text helpers', () => {
    createComponent();
    component.workEffortId = 'JOB123';
    const refreshSpy = spyOn<any>(component, 'refreshJobDetailSilently').and.stub();

    dialogSpy.open.and.returnValue({ afterClosed: () => of({ id: 7, noteText: 'Saved' }) } as any);
    component.openNoteDialog({ id: 7, internalNote: 'Existing internal' } as any);

    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(JobNoteDialogComponent);
    const noteDialogConfig = dialogSpy.open.calls.mostRecent().args[1] as any;
    expect(noteDialogConfig.data.noteData).toEqual(jasmine.objectContaining({
      id: 7,
      noteText: 'Existing internal',
      workEffortId: 'JOB123',
    }));
    expect(refreshSpy).toHaveBeenCalled();

    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    refreshSpy.calls.reset();
    component.openNoteDialog();
    expect(refreshSpy).not.toHaveBeenCalled();

    component.notes.set([{ id: 7, noteText: 'Delete me' } as any, { id: 8, noteText: 'Keep me' } as any]);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.deleteNote({ id: 7 } as any);

    expect(manufacturingServiceSpy.deleteJobNote).toHaveBeenCalledWith('JOB123', 7);
    expect(component.notes()).toEqual([{ id: 8, noteText: 'Keep me' } as any]);

    manufacturingServiceSpy.deleteJobNote.and.returnValue(throwError(() => new Error('delete note failed')));
    component.deleteNote({ id: 8 } as any);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('translated:MANUFACTURING.JOB_NOTE_DELETE_ERROR');

    expect(component.getNoteText({ noteText: 'Visible' } as any)).toBe('Visible');
    expect(component.getNoteText({ internalNote: 'Internal' } as any)).toBe('Internal');
    expect(component.getNoteText({} as any)).toBe('-');

    component.workEffortId = undefined;
    dialogSpy.open.calls.reset();
    component.openNoteDialog();
    component.deleteNote({ id: 1 } as any);
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('covers task start, complete dialog, job card pdf, and checklist error guards', fakeAsync(() => {
    createComponent();
    component.workEffortId = 'JOB123';
    const refreshSpy = spyOn<any>(component, 'refreshJobDetailSilently').and.stub();

    component.jobDetail.set({ currentStatusId: 'PRUN_RUNNING', workEffortId: 'JOB123' } as any);
    expect(component.canStartTask({ currentStatusId: 'PRUN_CREATED' } as any)).toBeTrue();
    expect(component.canStartTask({ currentStatusId: 'PRUN_COMPLETED' } as any)).toBeFalse();
    expect(component.canCompleteTask({ currentStatusId: 'PRUN_RUNNING' } as any)).toBeTrue();
    expect(component.canCompleteTask({ currentStatusId: 'PRUN_CANCELLED' } as any)).toBeFalse();

    component.startTask({ workEffortId: 'TASK-1' } as any);
    expect(manufacturingServiceSpy.startJobTask).toHaveBeenCalledWith('JOB123', 'TASK-1');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('translated:MANUFACTURING.TASK_START_SUCCESS');
    expect(refreshSpy).toHaveBeenCalled();

    manufacturingServiceSpy.startJobTask.and.returnValue(throwError(() => ({ error: { errorMessage: 'Cannot start' } })));
    component.startTask({ workEffortId: 'TASK-1' } as any);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('Cannot start');

    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.openCompleteTaskDialog({ workEffortId: 'TASK-1', workEffortName: 'Cut', estimatedMilliSeconds: 5400000 } as any);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(CompleteTaskDialogComponent);
    expect(dialogSpy.open.calls.mostRecent().args[1]?.data).toEqual(jasmine.objectContaining({
      taskId: 'TASK-1',
      estimatedHours: 1.5,
    }));

    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:job-card');
    const revokeSpy = spyOn(URL, 'revokeObjectURL');
    const openSpy = spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);

    component.openJobCardPdf();
    tick(1000);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('blob:job-card', '_blank');
    expect(revokeSpy).toHaveBeenCalledWith('blob:job-card');

    manufacturingServiceSpy.getJobCardPdf.and.returnValue(throwError(() => new Error('pdf failed')));
    component.openJobCardPdf();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('translated:MANUFACTURING.JOB_CARD_OPEN_ERROR');

    manufacturingServiceSpy.addJobExecutionChecklist.and.returnValue(throwError(() => ({ error: { message: 'Checklist failed' } })));
    component.executionChecklistForm.setValue({ category: 'QA', statusId: 'QA_FAILED', quantity: '', note: '' });
    component.submitExecutionChecklist();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('Checklist failed');

    component.workEffortId = undefined;
    manufacturingServiceSpy.startJobTask.calls.reset();
    component.startTask({ workEffortId: 'TASK-1' } as any);
    component.openCompleteTaskDialog({ workEffortId: 'TASK-1' } as any);
    expect(manufacturingServiceSpy.startJobTask).not.toHaveBeenCalled();
  }));

  it('covers issued material selection and return no-op branches', () => {
    createComponent();
    component.workEffortId = 'JOB123';
    component.issuedMaterials.set([
      { itemIssuanceId: 'ISSUE1' } as any,
      { itemIssuanceId: 'ISSUE2' } as any,
      { itemIssuanceId: '' } as any,
    ]);

    component.toggleIssuedMaterialSelection('', true);
    expect(component.selectedIssuedMaterialIds.size).toBe(0);

    component.toggleIssuedMaterialSelection('ISSUE1', true);
    component.toggleIssuedMaterialSelection('ISSUE2', true);
    component.toggleIssuedMaterialSelection('ISSUE2', false);
    expect(component.selectedIssuedMaterialIds.has('ISSUE1')).toBeTrue();
    expect(component.selectedIssuedMaterialIds.has('ISSUE2')).toBeFalse();

    component.returnQtyByIssuanceId['ISSUE1'] = '0';
    component.returnIssuedMaterials();
    expect(manufacturingServiceSpy.returnIssuedMaterial).not.toHaveBeenCalled();

    component.returnQtyByIssuanceId['ISSUE1'] = '3';
    component.returnIssuedMaterials();
    expect(manufacturingServiceSpy.returnIssuedMaterial).toHaveBeenCalledWith('JOB123', {
      itemIssuanceId: 'ISSUE1',
      quantity: '3',
      reasonEnumId: 'IRR_OTHER',
    });

    component.workEffortId = undefined;
    manufacturingServiceSpy.returnIssuedMaterial.calls.reset();
    component.returnIssuedMaterials();
    expect(manufacturingServiceSpy.returnIssuedMaterial).not.toHaveBeenCalled();

    expect(component.checklistLabel()).toBe('-');
    expect(component.workTypeLabel()).toBe('-');
    expect(component.workTypeLabel('DIRECT_LABOR')).toBe('DIRECT LABOR');
  });
});
