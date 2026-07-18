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
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ManufacturingService } from './manufacturing.service';
import { ApiService } from '../common/api.service';

describe('ManufacturingService', () => {
  let service: ManufacturingService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'put',
      'delete',
      'postFormData',
      'postWmsFormData',
      'getWmsBlob',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ManufacturingService,
        { provide: ApiService, useValue: spy },
      ],
    });

    service = TestBed.inject(ManufacturingService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('job list and detail', () => {
    it('getJobs builds paged URL and unwraps the OFBiz data wrapper', (done) => {
      apiServiceSpy.get.and.returnValue(of({
        data: { resultList: [{ workEffortId: 'WE1001' }], totalCount: 7, documentListCount: 7 },
      }));

      service.getJobs(1, 25, 'plate', 'WEPT_PRODUCTION_RUN').subscribe((result) => {
        expect(result.resultList?.length).toBe(1);
        expect(result.totalElements).toBe(7);
        done();
      });

      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        '/common/jobs?page=0&size=25&queryString=plate&purposeTypeId=WEPT_PRODUCTION_RUN'
      );
    });

    it('getJob unwraps response.data', (done) => {
      apiServiceSpy.get.and.returnValue(of({ data: { workEffortId: 'JOB1' } }));
      service.getJob('JOB/1').subscribe((detail: any) => {
        expect(detail.workEffortId).toBe('JOB1');
        done();
      });
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/jobs/JOB%2F1');
    });

    it('getJobCardPdf decodes base64 pdfBytes into a Blob', (done) => {
      apiServiceSpy.get.and.returnValue(of({ data: { pdfBytes: btoa('pdf-data') } }));
      service.getJobCardPdf('JOB1').subscribe((blob) => {
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/pdf');
        expect(blob.size).toBe('pdf-data'.length);
        done();
      });
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/jobs/JOB1/job-card/pdf');
    });

    it('createJob posts to /common/jobs', () => {
      apiServiceSpy.post.and.returnValue(of({ data: {} }));
      service.createJob({ workEffortName: 'New job' } as any).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs', { workEffortName: 'New job' });
    });
  });

  describe('job lifecycle', () => {
    beforeEach(() => apiServiceSpy.post.and.returnValue(of({ data: {} })));

    it('builds approve/start/complete/close URLs', () => {
      service.approveJob('JOB/1').subscribe();
      service.startJob('JOB/1').subscribe();
      service.completeJob('JOB/1').subscribe();
      service.closeJob('JOB/1').subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB%2F1/approve', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB%2F1/start', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB%2F1/complete', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB%2F1/close', {});
    });

    it('assignJobWorker posts the partyId', () => {
      service.assignJobWorker('JOB1', 'WORKER_1').subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/assign-worker', { partyId: 'WORKER_1' });
    });
  });

  describe('consumables', () => {
    beforeEach(() => {
      apiServiceSpy.get.and.returnValue(of({ data: {} }));
      apiServiceSpy.post.and.returnValue(of({ data: {} }));
      apiServiceSpy.put.and.returnValue(of({ data: {} }));
    });

    it('builds consumable CRUD and action URLs', () => {
      service.addConsumable('JOB1', { productId: 'P1' } as any).subscribe();
      service.updateConsumable('JOB1', 9, { estimatedQuantity: 2 } as any).subscribe();
      service.reserveConsumable('JOB1', 9, {} as any).subscribe();
      service.releaseConsumable('JOB1', 9, {} as any).subscribe();
      service.issueConsumable('JOB1', 9, {} as any).subscribe();
      service.cancelConsumable('JOB1', 9).subscribe();
      service.bulkReserveConsumables('JOB1').subscribe();
      service.bulkIssueConsumables('JOB1').subscribe();

      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/consumables', { productId: 'P1' });
      expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/9', { estimatedQuantity: 2 });
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/9/reserve', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/9/release', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/9/issue', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/9/cancel', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/bulk-reserve', {});
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/bulk-issue', {});
    });

    it('getConsumableInventoryOptions appends lot and container filters', () => {
      service.getConsumableInventoryOptions('JOB/1', 9, 'LOT-1', 'CONT-1').subscribe();
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        '/common/jobs/JOB%2F1/consumables/9/inventory-options?lotId=LOT-1&containerId=CONT-1'
      );
    });

    it('getConsumableInventoryOptions omits the query string without filters', () => {
      service.getConsumableInventoryOptions('JOB1', 9).subscribe();
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/jobs/JOB1/consumables/9/inventory-options');
    });

    it('returnIssuedMaterial and produceItem post to the job sub-resources', () => {
      service.returnIssuedMaterial('JOB1', { inventoryItemId: 'INV1' } as any).subscribe();
      service.produceItem('JOB1', { quantity: 2 } as any).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/issued-materials/return', { inventoryItemId: 'INV1' });
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/produced-items', { quantity: 2 });
    });
  });

  describe('job costs', () => {
    it('builds cost URLs', () => {
      apiServiceSpy.get.and.returnValue(of({ data: { totalCost: 10 } }));
      apiServiceSpy.post.and.returnValue(of({ data: {} }));
      apiServiceSpy.delete.and.returnValue(of({ data: {} }));

      service.getJobCosts('JOB1').subscribe();
      service.addJobCost('JOB1', { costComponentTypeId: 'LABOR_RUN', cost: 5 } as any).subscribe();
      service.deleteJobCost('JOB1', 42).subscribe();

      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/jobs/JOB1/costs');
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/costs', { costComponentTypeId: 'LABOR_RUN', cost: 5 });
      expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/jobs/JOB1/costs/42');
    });
  });

  describe('job contents', () => {
    it('addJobContent posts form data with the content type query param', () => {
      apiServiceSpy.postFormData.and.returnValue(of({ data: { contentId: 'CNT1' } }));
      const formData = new FormData();
      service.addJobContent('JOB/1', formData, 'IMAGE').subscribe();
      expect(apiServiceSpy.postFormData).toHaveBeenCalledWith(
        '/common/jobs/JOB%2F1/contents?workEffortContentTypeId=IMAGE', formData
      );
    });

    it('deleteJobContent uses the contentId string', () => {
      apiServiceSpy.delete.and.returnValue(of({ data: {} }));
      service.deleteJobContent('JOB/1', 'CONT/7').subscribe();
      expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/jobs/JOB%2F1/contents/CONT%2F7');
    });

    it('downloadJobContent decodes base64 fileBytes with the returned mime type', (done) => {
      apiServiceSpy.get.and.returnValue(of({
        data: { fileBytes: btoa('file-data'), mimeType: 'text/plain' },
      }));
      service.downloadJobContent('JOB1', 'CNT1').subscribe((blob) => {
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('text/plain');
        expect(blob.size).toBe('file-data'.length);
        done();
      });
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/jobs/JOB1/contents/CNT1');
    });

    it('downloadJobContent returns an empty Blob when fileBytes is missing', (done) => {
      apiServiceSpy.get.and.returnValue(of({ data: {} }));
      service.downloadJobContent('JOB1', 'CNT1').subscribe((blob) => {
        expect(blob.size).toBe(0);
        expect(blob.type).toBe('application/octet-stream');
        done();
      });
    });
  });

  describe('job notes and checklist', () => {
    it('builds note URLs', () => {
      apiServiceSpy.post.and.returnValue(of({ data: {} }));
      apiServiceSpy.put.and.returnValue(of({ data: {} }));
      apiServiceSpy.delete.and.returnValue(of({ data: {} }));

      service.createJobNote('JOB1', { noteInfo: 'hello' } as any).subscribe();
      service.updateJobNote('JOB1', 5, { noteInfo: 'edit' } as any).subscribe();
      service.deleteJobNote('JOB1', 5).subscribe();

      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/notes', { noteInfo: 'hello' });
      expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/jobs/JOB1/notes/5', { noteInfo: 'edit' });
      expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/jobs/JOB1/notes/5');
    });

    it('lists and adds execution checklist entries', () => {
      apiServiceSpy.get.and.returnValue(of({ data: { resultList: [{ checklistId: 'C1' }] } }));
      apiServiceSpy.post.and.returnValue(of({ data: { checklistId: 'C2' } }));

      service.listJobExecutionChecklist('JOB1').subscribe((items) => {
        expect(items).toHaveSize(1);
      });
      service.addJobExecutionChecklist('JOB1', { description: 'Check welds' } as any).subscribe();

      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/jobs/JOB1/execution-checklist');
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/JOB1/execution-checklist', { description: 'Check welds' });
    });
  });

  describe('BOM', () => {
    it('getBoms builds paged URL and maps list counts', (done) => {
      apiServiceSpy.get.and.returnValue(of({
        data: { resultList: [{ productId: 'P1' }], documentListCount: 3 },
      }));
      service.getBoms(2, 10, 'steel', 'MANUF_COMPONENT').subscribe((result) => {
        expect(result.resultList?.length).toBe(1);
        expect(result.documentListCount).toBe(3);
        done();
      });
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        '/common/boms?page=1&size=10&queryString=steel&bomTypeId=MANUF_COMPONENT'
      );
    });

    it('getBomDetail unwraps response.data', () => {
      apiServiceSpy.get.and.returnValue(of({ data: { productId: 'P1' } }));
      service.getBomDetail('P/1').subscribe();
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/boms/P%2F1');
    });

    it('addBomDocument sets productContentTypeId on the form data', () => {
      apiServiceSpy.postWmsFormData.and.returnValue(of({ data: {} }));
      const formData = new FormData();
      service.addBomDocument('P1', formData).subscribe();
      expect(formData.get('productContentTypeId')).toBe('DOCUMENT');
      expect(apiServiceSpy.postWmsFormData).toHaveBeenCalledWith('/common/products/P1/contents', formData);
    });

    it('downloadBomDocument decodes base64 fileBytes', (done) => {
      apiServiceSpy.get.and.returnValue(of({
        data: { fileBytes: btoa('doc'), mimeType: 'application/pdf' },
      }));
      service.downloadBomDocument('P1', 'CNT1').subscribe((blob) => {
        expect(blob.type).toBe('application/pdf');
        expect(blob.size).toBe(3);
        done();
      });
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/products/P1/contents/CNT1');
    });
  });

  describe('routings and operations', () => {
    beforeEach(() => {
      apiServiceSpy.get.and.returnValue(of({ data: {} }));
      apiServiceSpy.post.and.returnValue(of({ data: {} }));
      apiServiceSpy.put.and.returnValue(of({ data: {} }));
      apiServiceSpy.delete.and.returnValue(of({ data: {} }));
    });

    it('builds operation detail URLs', () => {
      service.getOperationDetail('OP/1').subscribe();
      service.updateOperation('OP/1', { operationName: 'Weld' } as any).subscribe();

      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/routings/operations/OP%2F1');
      expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/routings/operations/OP%2F1', { operationName: 'Weld' });
    });
  });

  describe('product assocs', () => {
    beforeEach(() => {
      apiServiceSpy.get.and.returnValue(of({ data: { resultList: [] } }));
      apiServiceSpy.post.and.returnValue(of({ data: {} }));
      apiServiceSpy.put.and.returnValue(of({ data: {} }));
    });

    it('builds product assoc URLs', () => {
      service.getProductAssocTypes().subscribe();
      service.getProductAssocs().subscribe();
      service.updateProductAssoc(3, { quantity: 2 } as any).subscribe();
      service.expireProductAssoc(3).subscribe();

      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/product-assoc-types');
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/product-assocs');
      expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/product-assocs/3', { quantity: 2 });
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/product-assocs/3/expire', {});
    });

    it('addProductAssoc mirrors productIdTo and type aliases in the payload', () => {
      service.addProductAssoc('P1', { productIdTo: 'P2', productAssocTypeId: 'MANUF_COMPONENT' } as any).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/product-assocs', jasmine.objectContaining({
        productId: 'P1',
        productIdTo: 'P2',
        toProductId: 'P2',
        productAssocTypeId: 'MANUF_COMPONENT',
        productAssocTypeEnumId: 'MANUF_COMPONENT',
      }));
    });
  });

  describe('work efforts', () => {
    beforeEach(() => {
      apiServiceSpy.get.and.returnValue(of({ data: { resultList: [] } }));
      apiServiceSpy.post.and.returnValue(of({ data: {} }));
      apiServiceSpy.put.and.returnValue(of({ data: {} }));
    });

    it('getWorkEfforts builds the query from provided params only', () => {
      service.getWorkEfforts({ workEffortIds: 'WE1,WE2', workEffortTypeIds: 'TASK', queryString: 'cut', size: 20 }).subscribe();
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        '/common/work-efforts?workEffortIds=WE1%2CWE2&workEffortTypeIds=TASK&queryString=cut&size=20'
      );

      service.getWorkEfforts().subscribe();
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/work-efforts');
    });

    it('creates and updates work efforts', () => {
      service.createWorkEffort({ workEffortName: 'Task 1' } as any).subscribe();
      service.updateWorkEffort(12, { description: 'Updated task' } as any).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/work-efforts', { workEffortName: 'Task 1' });
      expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/work-efforts/12', { description: 'Updated task' });
    });

    it('getWorkEffortAssocs builds the assoc query', () => {
      service.getWorkEffortAssocs({ workEffortIdFrom: 'WE1', workEffortAssocTypeId: 'WORK_EFF_DEPENDENCY' }).subscribe();
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        '/common/work-effort-assocs?workEffortIdFrom=WE1&workEffortAssocTypeId=WORK_EFF_DEPENDENCY'
      );
    });
  });

  describe('response unwrapping variants', () => {
    it('extracts lists from bare arrays, data.resultList, and documentList shapes', (done) => {
      apiServiceSpy.get.and.returnValue(of({ documentList: [{ workEffortId: 'A' }, { workEffortId: 'B' }] }));
      service.getJobs(1, 10, '').subscribe((result) => {
        expect(result.resultList?.length).toBe(2);
        expect(result.totalElements).toBe(2);
        done();
      });
    });

    it('extracts lists from data.documentList', (done) => {
      apiServiceSpy.get.and.returnValue(of({ data: { documentList: [{ workEffortId: 'C' }] } }));
      service.getJobs(1, 10, '').subscribe((result) => {
        expect(result.resultList?.length).toBe(1);
        done();
      });
    });

    it('extracts lists from resultList', (done) => {
      apiServiceSpy.get.and.returnValue(of({ resultList: [{ workEffortId: 'D' }] }));
      service.getJobs(1, 10, '').subscribe((result) => {
        expect(result.resultList?.length).toBe(1);
        done();
      });
    });

    it('extracts lists from data as array', (done) => {
      apiServiceSpy.get.and.returnValue(of({ data: [{ workEffortId: 'E' }] }));
      service.getJobs(1, 10, '').subscribe((result) => {
        expect(result.resultList?.length).toBe(1);
        done();
      });
    });

    it('returns empty list for invalid format', (done) => {
      apiServiceSpy.get.and.returnValue(of({ invalidFormat: {} }));
      service.getJobs(1, 10, '').subscribe((result) => {
        expect(result.resultList?.length).toBe(0);
        done();
      });
    });
  });

  describe('additional job tasks APIs', () => {
    beforeEach(() => {
      apiServiceSpy.post.and.returnValue(of({ data: { success: true } }));
    });

    it('cancelConsumable posts to consumables endpoint', () => {
      service.cancelConsumable('WE100', 5).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/WE100/consumables/5/cancel', {});
    });

    it('produceItem posts to produced-items endpoint', () => {
      const payload = { productId: 'P1', quantity: 10 };
      service.produceItem('WE100', payload).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/WE100/produced-items', payload);
    });

    it('startJobTask posts to task start endpoint', () => {
      service.startJobTask('WE100', 'T1').subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/WE100/tasks/T1/start', {});
    });

    it('completeJobTask posts to task complete endpoint', () => {
      const payload = { actualHours: 4.5 };
      service.completeJobTask('WE100', 'T1', payload).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/WE100/tasks/T1/complete', payload);
    });

    it('returnIssuedMaterial posts to return endpoint', () => {
      const payload = { productId: 'P1', quantity: 2 };
      service.returnIssuedMaterial('WE100', payload).subscribe();
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/jobs/WE100/issued-materials/return', payload);
    });

    it('getJobBom retrieves components and maps them', (done) => {
      const responseMock = {
        data: {
          components: [
            { productId: 'COMP-1', productName: 'Comp 1', quantity: 5 },
            { productId: 'COMP-2', productName: 'Comp 2', estimatedQuantity: 10 },
          ]
        }
      };
      apiServiceSpy.get.and.returnValue(of(responseMock));

      service.getJobBom('PROD-1').subscribe((res: any) => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/boms/PROD-1');
        expect(res).toEqual([
          { productId: 'COMP-1', productName: 'Comp 1', estimatedQuantity: 5 },
          { productId: 'COMP-2', productName: 'Comp 2', estimatedQuantity: 10 },
        ]);
        done();
      });
    });
  });
});
