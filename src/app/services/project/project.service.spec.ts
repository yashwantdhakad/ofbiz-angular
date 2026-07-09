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
import { ApiService } from '../common/api.service';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj<ApiService>('ApiService', ['getWms', 'postWms', 'putWms', 'deleteWms']);
    apiServiceSpy.getWms.and.returnValue(of({} as never));
    apiServiceSpy.postWms.and.returnValue(of({} as never));
    apiServiceSpy.putWms.and.returnValue(of({} as never));
    apiServiceSpy.deleteWms.and.returnValue(of({} as never));

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(ProjectService);
  });

  it('listProjects calls wms endpoint with size parameter', () => {
    service.listProjects(50).subscribe();
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/work-efforts?workEffortTypeIds=PROJECT&size=50');
  });

  it('getProject calls get endpoint with id', () => {
    service.getProject('PROJ-1').subscribe();
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/work-efforts/PROJ-1');
  });

  it('createProject calls post endpoint', () => {
    const payload = { workEffortName: 'New Project' };
    service.createProject(payload).subscribe();
    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/work-efforts', payload);
  });

  it('updateProject calls put endpoint', () => {
    const payload = { workEffortName: 'Updated' };
    service.updateProject('PROJ-1', payload).subscribe();
    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/work-efforts/PROJ-1', payload);
  });

  it('deleteProject calls delete endpoint', () => {
    service.deleteProject('PROJ-1').subscribe();
    expect(apiServiceSpy.deleteWms).toHaveBeenCalledWith('/work-efforts/PROJ-1');
  });

  it('getWbs calls wbs endpoint', () => {
    service.getWbs('PROJ-1').subscribe();
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/projects/PROJ-1/wbs');
  });

  it('getMetrics builds metrics url with or without actualCost query parameter', () => {
    service.getMetrics('PROJ-1').subscribe();
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/projects/PROJ-1/metrics');

    service.getMetrics('PROJ-1', NaN).subscribe();
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/projects/PROJ-1/metrics');

    service.getMetrics('PROJ-1', 4500).subscribe();
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/projects/PROJ-1/metrics?actualCost=4500');
  });

  it('builds planning query parameters', () => {
    service.getPlanning({
      fromDate: '2026-06-01',
      thruDate: '2026-06-30',
      queryString: 'job',
      workEffortTypeIds: 'PROJECT,ROU_TASK',
      statusId: 'ACTIVE',
      facilityId: 'FAC-1',
      limit: 80,
    }).subscribe();

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith(
      '/projects/planning?fromDate=2026-06-01&thruDate=2026-06-30&queryString=job&workEffortTypeIds=PROJECT%2CROU_TASK&statusId=ACTIVE&facilityId=FAC-1&limit=80'
    );
  });

  it('calls getPlanning without parameters', () => {
    service.getPlanning().subscribe();
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/projects/planning');
  });
});
