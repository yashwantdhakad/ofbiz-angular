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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ConfirmationDialogComponent } from '@ofbiz/components/common/confirmation-dialog/confirmation-dialog.component';
import { AddDeliverableItemDialogComponent } from '../add-deliverable-item-dialog/add-deliverable-item-dialog.component';
import { AddOperationDialogComponent } from '../add-operation-dialog/add-operation-dialog.component';
import { AddRoutingContentDialogComponent } from '../add-routing-content-dialog/add-routing-content-dialog.component';
import { EditRoutingDialogComponent } from '../edit-routing-dialog/edit-routing-dialog.component';
import { RoutingApiResponse } from '@ofbiz/models/manufacturing.model';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RoutingService } from '@ofbiz/services/manufacturing/routing.service';
import { RoutingDetailComponent } from './routing-detail.component';

describe('RoutingDetailComponent', () => {
  let component: RoutingDetailComponent;
  let fixture: ComponentFixture<RoutingDetailComponent>;
  let routingServiceSpy: jasmine.SpyObj<RoutingService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routingServiceSpy = jasmine.createSpyObj<RoutingService>('RoutingService', [
      'getRoutingDetail',
      'updateRouting',
      'addOperation',
      'deleteOperation',
      'addDeliverableItem',
      'updateDeliverableItem',
      'deleteDeliverableItem',
      'addRoutingContent',
      'deleteRoutingContent',
      'downloadRoutingContent',
    ]);
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    snackbarServiceSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    const renderSchedulerSpy = jasmine.createSpyObj<RenderSchedulerService>('RenderSchedulerService', [
      'deferMacrotask',
      'defer',
      'markForCheck',
      'detectChanges',
    ]);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.defer.and.callFake((fn: () => void) => fn());

    const translateSpy = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [RoutingDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ workEffortId: 'ROU100' })),
          },
        },
        { provide: Router, useValue: routerSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(RoutingDetailComponent, { set: { template: '' } })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RoutingDetailComponent);
    component = fixture.componentInstance;
  });

  function openDialogResult(result: unknown): void {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(result),
    } as any);
  }

  it('loads routing detail from nested response payloads and clears state on failure', () => {
    const response: RoutingApiResponse = {
      responseMap: {
        result: {
          routing: { workEffortId: 'ROU100', workEffortName: 'Main Routing' },
          operations: [{ workEffortId: 'OP1', workEffortName: 'Cutting' }],
          deliverableItems: [{ id: 1, productId: 'P100', productName: 'Widget' }],
          contents: [{ id: 11, contentId: 'CNT1', contentName: 'Spec' }],
        },
      },
    };
    routingServiceSpy.getRoutingDetail.and.returnValues(of(response), throwError(() => new Error('load failed')));

    fixture.detectChanges();

    expect(component.workEffortId()).toBe('ROU100');
    expect(component.routing()?.workEffortName).toBe('Main Routing');
    expect(component.operations()).toHaveSize(1);
    expect(component.deliverableItems()).toHaveSize(1);
    expect(component.contents()).toHaveSize(1);

    component.workEffortId.set('ROU100');
    component['loadDetail']();

    expect(component.routing()).toBeNull();
    expect(component.operations()).toEqual([]);
    expect(component.deliverableItems()).toEqual([]);
    expect(component.contents()).toEqual([]);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.ROUTING_LOAD_ERROR');
  });

  it('navigates back to the routing list', () => {
    component.backToList();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/routings']);
  });

  it('formats dates defensively', () => {
    expect(component.formatDate(null)).toBe('-');
    expect(component.formatDate('')).toBe('-');
    expect(component.formatDate('invalid')).toBe('-');
    expect(component.formatDate('2026-04-08T00:00:00Z')).toContain('2026');
  });

  it('updates routing and refreshes after edit dialog save, and reports errors', () => {
    routingServiceSpy.getRoutingDetail.and.returnValues(
      of({ routing: { workEffortId: 'ROU100', workEffortName: 'Original Routing' } }),
      of({ routing: { workEffortId: 'ROU100', workEffortName: 'Updated Routing' } })
    );
    routingServiceSpy.updateRouting.and.returnValues(of({} as any), throwError(() => new Error('update failed')));
    dialogSpy.open.and.returnValues(
      { afterClosed: () => of({ workEffortName: 'Updated Routing', description: 'Updated', quantityToProduce: '10' }) } as any,
      { afterClosed: () => of({ workEffortName: 'Broken' }) } as any
    );

    fixture.detectChanges();
    component.openEditRoutingDialog();

    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(EditRoutingDialogComponent);
    expect(routingServiceSpy.updateRouting).toHaveBeenCalledWith('ROU100', {
      workEffortName: 'Updated Routing',
      description: 'Updated',
      quantityToProduce: '10',
    });
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.ROUTING_UPDATED_SUCCESS');
    expect(routingServiceSpy.getRoutingDetail).toHaveBeenCalledTimes(2);

    component.openEditRoutingDialog();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.ROUTING_UPDATED_ERROR');
  });

  it('opens the add operation dialog with the next sequence and handles success/error', () => {
    routingServiceSpy.getRoutingDetail.and.returnValue(of({ routing: { workEffortId: 'ROU100' } }));
    routingServiceSpy.addOperation.and.returnValues(of({} as any), throwError(() => new Error('add failed')));
    dialogSpy.open.and.returnValues(
      {
        afterClosed: () =>
          of({
            operationWorkEffortId: 'OP-1',
            sequenceNum: '40',
            fromDate: '2026-04-08T00:00:00Z',
            thruDate: null,
          }),
      } as any,
      { afterClosed: () => of({ operationWorkEffortId: 'OP-2' }) } as any
    );
    component.workEffortId.set('ROU100');
    component.operations.set([{ sequenceNum: '10' } as any, { sequenceNum: '30' } as any]);

    component.openAddOperationDialog();

    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(AddOperationDialogComponent);
    expect(dialogSpy.open.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ data: { sequenceNum: '40' } }));
    expect(routingServiceSpy.addOperation).toHaveBeenCalledWith('ROU100', jasmine.any(Object));
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.OPERATION_ADDED_SUCCESS');

    component.openAddOperationDialog();
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.OPERATION_ADDED_ERROR');
  });

  it('guards and deletes operations with confirmation', () => {
    routingServiceSpy.getRoutingDetail.and.returnValue(of({ routing: { workEffortId: 'ROU100' } }));
    routingServiceSpy.deleteOperation.and.returnValues(of({} as any), throwError(() => new Error('delete failed')));
    component.workEffortId.set('ROU100');

    const initialOpenCount = dialogSpy.open.calls.count();
    component.removeOperation({} as any);
    expect(dialogSpy.open.calls.count()).toBe(initialOpenCount);

    openDialogResult(false);
    component.removeOperation({ workEffortId: 'OP-1' } as any);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(ConfirmationDialogComponent);
    expect(routingServiceSpy.deleteOperation).not.toHaveBeenCalled();

    openDialogResult(true);
    component.removeOperation({ operationWorkEffortId: 'OP-2' } as any);
    expect(routingServiceSpy.deleteOperation).toHaveBeenCalledWith('ROU100', 'OP-2');
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.OPERATION_REMOVED_SUCCESS');

    openDialogResult(true);
    component.removeOperation({ workEffortId: 'OP-3' } as any);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.OPERATION_REMOVED_ERROR');
  });

  it('handles deliverable item add/edit/remove branches', () => {
    routingServiceSpy.getRoutingDetail.and.returnValue(of({ routing: { workEffortId: 'ROU100' } }));
    routingServiceSpy.addDeliverableItem.and.returnValues(of({} as any), throwError(() => new Error('add failed')));
    routingServiceSpy.updateDeliverableItem.and.returnValues(of({} as any), throwError(() => new Error('update failed')));
    routingServiceSpy.deleteDeliverableItem.and.returnValues(of({} as any), throwError(() => new Error('delete failed')));
    component.workEffortId.set('ROU100');

    dialogSpy.open.and.returnValue({ afterClosed: () => of({ productId: 'P-1', estimatedQuantity: '4' }) } as any);
    component.openAddDeliverableDialog();
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(AddDeliverableItemDialogComponent);
    expect(routingServiceSpy.addDeliverableItem).toHaveBeenCalledWith('ROU100', jasmine.any(Object));
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.DELIVERABLE_ADDED_SUCCESS');

    dialogSpy.open.and.returnValue({ afterClosed: () => of({ productId: 'P-1', estimatedQuantity: '4' }) } as any);
    component.openAddDeliverableDialog();
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.DELIVERABLE_ADDED_ERROR');

    const openCountBeforeInvalidEdit = dialogSpy.open.calls.count();
    component.openEditDeliverableDialog({} as any);
    expect(dialogSpy.open.calls.count()).toBe(openCountBeforeInvalidEdit);

    openDialogResult({ productId: 'P-1', estimatedQuantity: '4' });
    component.openEditDeliverableDialog({ id: 7 } as any);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(AddDeliverableItemDialogComponent);
    expect(routingServiceSpy.updateDeliverableItem).toHaveBeenCalledWith(
      'ROU100',
      7,
      jasmine.any(Object)
    );
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.DELIVERABLE_UPDATED_SUCCESS');

    openDialogResult({ productId: 'P-1' });
    component.openEditDeliverableDialog({ id: 8 } as any);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.DELIVERABLE_UPDATED_ERROR');

    const openCountBeforeInvalidDelete = dialogSpy.open.calls.count();
    component.removeDeliverableItem({} as any);
    expect(dialogSpy.open.calls.count()).toBe(openCountBeforeInvalidDelete);

    openDialogResult(false);
    component.removeDeliverableItem({ id: 9 } as any);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(ConfirmationDialogComponent);
    expect(routingServiceSpy.deleteDeliverableItem).not.toHaveBeenCalledWith('ROU100', 9);

    openDialogResult(true);
    component.removeDeliverableItem({ id: 10 } as any);
    expect(routingServiceSpy.deleteDeliverableItem).toHaveBeenCalledWith('ROU100', 10);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.DELIVERABLE_REMOVED_SUCCESS');

    openDialogResult(true);
    component.removeDeliverableItem({ id: 11 } as any);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.DELIVERABLE_REMOVED_ERROR');
  });

  it('handles content add/open/remove branches', fakeAsync(() => {
    routingServiceSpy.getRoutingDetail.and.returnValue(of({ routing: { workEffortId: 'ROU100' } }));
    routingServiceSpy.addRoutingContent.and.returnValues(of({} as any), throwError(() => new Error('add failed')));
    routingServiceSpy.deleteRoutingContent.and.returnValues(of({} as any), throwError(() => new Error('delete failed')));
    routingServiceSpy.downloadRoutingContent.and.returnValues(of(new Blob(['file'])), throwError(() => new Error('open failed')));
    component.workEffortId.set('ROU100');

    dialogSpy.open.and.returnValue({ afterClosed: () => of({ formData: { title: 'Spec' }, workEffortContentTypeId: 'PDF' }) } as any);
    component.openAddContentDialog('PDF');
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(AddRoutingContentDialogComponent);
    expect(routingServiceSpy.addRoutingContent).toHaveBeenCalledWith('ROU100', jasmine.any(Object), jasmine.any(String));
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.CONTENT_ADDED_SUCCESS');

    dialogSpy.open.and.returnValue({ afterClosed: () => of({ formData: { title: 'Spec' }, workEffortContentTypeId: 'PDF' }) } as any);
    component.openAddContentDialog('PDF');
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.CONTENT_ADDED_ERROR');

    component.openContent({} as any);
    expect(routingServiceSpy.downloadRoutingContent).not.toHaveBeenCalled();

    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    const revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');
    const windowOpenSpy = spyOn(window, 'open').and.stub();

    component.openContent({ contentId: 'CNT-1' } as any);
    tick(10000);

    expect(routingServiceSpy.downloadRoutingContent).toHaveBeenCalledWith('ROU100', 'CNT-1');
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith('blob:url', '_blank', 'noopener');
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:url');

    component.openContent({ contentId: 'CNT-2' } as any);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.CONTENT_OPEN_ERROR');

    const openCountBeforeInvalidContentDelete = dialogSpy.open.calls.count();
    component.removeContent({} as any);
    expect(dialogSpy.open.calls.count()).toBe(openCountBeforeInvalidContentDelete);

    openDialogResult(false);
    component.removeContent({ contentId: 'CNT1' } as any);
    expect(dialogSpy.open.calls.mostRecent().args[0]).toBe(ConfirmationDialogComponent);
    expect(routingServiceSpy.deleteRoutingContent).not.toHaveBeenCalledWith('ROU100', 'CNT1');

    openDialogResult(true);
    component.removeContent({ contentId: 'CNT2' } as any);
    expect(routingServiceSpy.deleteRoutingContent).toHaveBeenCalledWith('ROU100', 'CNT2');
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.CONTENT_REMOVED_SUCCESS');

    openDialogResult(true);
    component.removeContent({ contentId: 'CNT3' } as any);
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.CONTENT_REMOVED_ERROR');
  }));
});
