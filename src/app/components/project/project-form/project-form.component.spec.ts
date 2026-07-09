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
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ProjectFormComponent } from './project-form.component';
import { ProjectService, ProjectSummary } from '../../../services/project/project.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('ProjectFormComponent', () => {
  let fixture: ComponentFixture<ProjectFormComponent>;
  let component: ProjectFormComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateSpy: any;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    projectServiceSpy = jasmine.createSpyObj('ProjectService', ['getProject', 'createProject', 'updateProject', 'deleteProject', 'listProjects', 'getWbs', 'getMetrics']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream'], {
      onLangChange: of({}),
      onTranslationChange: of({}),
      onDefaultLangChange: of({}),
    });
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.returnValue(of(''));
    translateSpy.stream.and.returnValue(of(''));

    projectServiceSpy.getProject.and.returnValue(of({
      workEffortId: 'PROJ-100',
      workEffortName: 'Project 100',
      description: 'Existing project',
      workEffortTypeId: 'PROJECT',
      currentStatusId: 'PROJECT_ACTIVE',
      percentComplete: '20',
      totalMoneyAllowed: '1000',
      moneyUomId: 'USD',
    } as ProjectSummary));
    projectServiceSpy.updateProject.and.returnValue(of({
      workEffortId: 'PROJ-100',
      workEffortName: 'Project 100',
    } as ProjectSummary));
    projectServiceSpy.createProject.and.returnValue(of({
      workEffortId: 'PROJ-200',
      workEffortName: 'New Project',
    } as ProjectSummary));

    await TestBed.configureTestingModule({
      declarations: [ProjectFormComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { mode: 'edit' },
              paramMap: { get: (key: string) => (key === 'id' ? 'PROJ-100' : null) },
            },
          },
        },
        { provide: Router, useValue: routerSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectFormComponent);
    component = fixture.componentInstance;
  });

  it('loads the project and returns to detail on cancel in edit mode', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.cancel();

    expect(projectServiceSpy.getProject).toHaveBeenCalledWith('PROJ-100');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/projects', 'PROJ-100']);
  }));

  it('saves the project and returns to detail in edit mode', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.projectForm.patchValue({
      workEffortId: 'PROJ-100',
      workEffortName: 'Project 100',
      workEffortTypeId: 'PROJECT',
      currentStatusId: 'PROJECT_ACTIVE',
      percentComplete: '25',
      totalMoneyAllowed: '1200',
      moneyUomId: 'USD',
    });

    component.save();
    tick();

    expect(projectServiceSpy.updateProject).toHaveBeenCalledWith('PROJ-100', jasmine.objectContaining({
      workEffortId: 'PROJ-100',
      workEffortName: 'Project 100',
    }));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/projects', 'PROJ-100']);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PROJECTS.UPDATE_SUCCESS');
  }));
});
