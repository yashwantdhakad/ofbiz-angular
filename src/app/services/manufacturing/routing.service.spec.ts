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
import { RoutingService } from './routing.service';
import { ApiService } from '../common/api.service';

describe('RoutingService', () => {
  let service: RoutingService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'put',
      'delete',
      'postFormData',
    ]);

    TestBed.configureTestingModule({
      providers: [
        RoutingService,
        { provide: ApiService, useValue: spy },
      ],
    });

    service = TestBed.inject(RoutingService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;

    apiServiceSpy.get.and.returnValue(of({ data: {} }));
    apiServiceSpy.post.and.returnValue(of({ data: {} }));
    apiServiceSpy.put.and.returnValue(of({ data: {} }));
    apiServiceSpy.delete.and.returnValue(of({ data: {} }));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getRoutings builds paged URL', () => {
    service.getRoutings(1, 20, 'cut').subscribe();
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/routings?page=0&size=20&queryString=cut');
  });

  it('builds routing CRUD URLs', () => {
    service.getRouting('ROUTING/1').subscribe();
    service.createRouting({ workEffortName: 'New routing' } as any).subscribe();
    service.updateRouting('ROUTING/1', { description: 'Updated' } as any).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/routings/ROUTING%2F1');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/routings',
      { workEffortName: 'New routing', workEffortTypeId: 'ROUTING' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/routings/ROUTING%2F1', { description: 'Updated' });
  });

  it('builds operation and deliverable item URLs', () => {
    service.addOperation('ROUTING1', { operationName: 'Cut' }).subscribe();
    service.deleteOperation('ROUTING1', 'OP_1').subscribe();
    service.addDeliverableItem('ROUTING1', { productId: 'PROD_1' } as any).subscribe();
    service.updateDeliverableItem('ROUTING1', 8, { quantity: 5 } as any).subscribe();
    service.deleteDeliverableItem('ROUTING1', 8).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/routings/ROUTING1/operations', { operationName: 'Cut' });
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/routings/ROUTING1/operations/OP_1');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/routings/ROUTING1/deliverable-items', { productId: 'PROD_1' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/routings/ROUTING1/deliverable-items/8', { quantity: 5 });
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/routings/ROUTING1/deliverable-items/8');
  });

  it('builds routing content URLs', () => {
    apiServiceSpy.postFormData.and.returnValue(of({ data: {} }));
    const formData = new FormData();

    service.addRoutingContent('ROUTING/1', formData, 'IMAGE').subscribe();
    service.deleteRoutingContent('ROUTING/1', 'CONT/7').subscribe();
    service.downloadRoutingContent('ROUTING/1', 'CONTENT/1').subscribe();

    expect(apiServiceSpy.postFormData).toHaveBeenCalledWith(
      '/common/routings/ROUTING%2F1/contents?workEffortContentTypeId=IMAGE', formData);
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/routings/ROUTING%2F1/contents/CONT%2F7');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/routings/ROUTING%2F1/contents/CONTENT%2F1');
  });
});
