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
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProjectService } from '@ofbiz/services/project/project.service';
import { ProjectPlanningComponent } from './project-planning.component';

describe('ProjectPlanningComponent', () => {
  let component: ProjectPlanningComponent;
  let fixture: ComponentFixture<ProjectPlanningComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let router: Router;

  beforeEach(async () => {
    projectServiceSpy = jasmine.createSpyObj<ProjectService>('ProjectService', ['getPlanning']);
    projectServiceSpy.getPlanning.and.returnValue(of({
      summary: { totalItems: 1, lateItems: 0, blockedItems: 0, readyItems: 1, averagePercentComplete: 25 },
      items: [{
        id: 1,
        workEffortId: 'PRJ-1',
        workEffortName: 'Plant rollout',
        currentStatusId: 'ACTIVE',
        estimatedStartDate: '2026-06-01T00:00:00',
        estimatedCompletionDate: '2026-06-05T00:00:00',
        percentComplete: '25',
        timelineStartOffsetDays: 0,
        timelineDurationDays: 5,
        timelineProgressDays: 1,
        dependencyCount: 0,
        blockedByCount: 0,
        successorCount: 0,
        late: false,
        ready: true,
      }],
    }));

    await TestBed.configureTestingModule({
      imports: [],
      declarations: [ProjectPlanningComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectPlanningComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('loads look-ahead data with filters', fakeAsync(() => {
    component.search();
    tick();
    fixture.detectChanges();

    expect(projectServiceSpy.getPlanning).toHaveBeenCalled();
    expect(component.displayedItems()).toHaveSize(1);
    expect(component.summary()?.totalItems).toBe(1);
  }));

  it('resets filters and clears loaded planning', () => {
    component.clearFilters();
    expect(component.hasSearched()).toBeFalse();
    expect(component.planning()).toBeNull();
  });

  it('navigates to create project', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    component.createProject();
    expect(navigateSpy).toHaveBeenCalledWith(['/projects/new']);
  });
});
