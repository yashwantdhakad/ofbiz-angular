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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { BomDetailComponent } from './bom-detail.component';
import { TranslateService } from '@ngx-translate/core';

describe('BomDetailComponent', () => {
  let component: BomDetailComponent;
  let fixture: ComponentFixture<BomDetailComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj('ManufacturingService', ['getBomDetail', 'expireProductAssoc']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    translate = jasmine.createSpyObj('TranslateService', ['instant']);

    manufacturingService.getBomDetail.and.returnValue(of({
      productId: 'FG_100',
      productName: 'Finished Good',
      bomTypeId: 'MANUF_COMPONENT',
      bomTypeLabel: 'Manufacturing Component',
      components: [{ assocId: 11, productId: 'RM_100', quantity: 2 }],
    }));
    manufacturingService.expireProductAssoc.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [BomDetailComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: MatDialog, useValue: dialog },
        { provide: TranslateService, useValue: translate },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ productId: 'FG_100' })),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(BomDetailComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(BomDetailComponent);
    component = fixture.componentInstance;
    translate.instant.and.callFake((key: string) => key);
    (translate as any).get = jasmine.createSpy('get').and.callFake((key: string) => of(key));
    fixture.detectChanges();
  });

  it('should load BOM detail from route product id', () => {
    expect(manufacturingService.getBomDetail).toHaveBeenCalledWith('FG_100');
    expect(component.productId).toBe('FG_100');
    expect(component.components).toHaveSize(1);
  });

  it('should open add component dialog', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    component.openAddComponentDialog();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('should guard add and edit dialogs when required ids are missing', () => {
    component.productId = '';
    component.openAddComponentDialog();
    component.openEditComponentDialog({ assocId: 11, seq: 1 });

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('should reload after add or edit dialog saves', () => {
    const reloadSpy = spyOn<any>(component, 'reloadBom');
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);

    component.openAddComponentDialog();
    component.openEditComponentDialog({ assocId: 11, seq: 1, componentId: 'RM_100' });

    expect(reloadSpy).toHaveBeenCalledTimes(2);
  });

  it('should guard edit and delete paths without ids', () => {
    component.productId = '';
    component.openEditComponentDialog({ assocId: 11, seq: 1 });
    component.confirmDeleteComponent({ seq: 1 });

    expect(dialog.open).not.toHaveBeenCalled();
    expect(manufacturingService.expireProductAssoc).not.toHaveBeenCalled();
  });

  it('should expire component after confirmation', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    const reloadSpy = spyOn<any>(component, 'reloadBom');
    component.confirmDeleteComponent({ assocId: 11, seq: 1 });
    expect(manufacturingService.expireProductAssoc).toHaveBeenCalledWith(11);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should not expire when delete is cancelled', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);

    component.confirmDeleteComponent({ assocId: 11, seq: 1 });

    expect(manufacturingService.expireProductAssoc).not.toHaveBeenCalled();
  });

  it('should load BOM defaults and stop loader when response is sparse', () => {
    manufacturingService.getBomDetail.and.returnValue(of({
      productId: '',
      productName: '',
      internalName: '',
      bomTypeId: '',
      bomTypeLabel: '',
      components: null as any,
    }));

    component.isLoading.set(false);
    component.loadBom('FG_200', false).subscribe();

    expect(component.productId).toBe('FG_200');
    expect(component.productName).toBe('FG_200');
    expect(component.productInternalName).toBe('');
    expect(component.bomTypeId).toBe('');
    expect(component.bomTypeLabel).toBe('');
    expect(component.components).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  });

  it('should handle delete failure, simulation helpers, and load guards', async () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    manufacturingService.expireProductAssoc.and.returnValue(throwError(() => new Error('expire failed')));
    spyOn(console, 'error');

    component.confirmDeleteComponent({ assocId: 11, seq: 1 });
    expect(console.error).toHaveBeenCalled();

    component.toggleSimulationNode({ key: 'leaf', children: [] } as any);
    expect(component.isExpanded({ key: 'leaf' } as any)).toBeFalse();

    component.simulationTree = [
      {
        key: 'root',
        productId: 'FG_100',
        productName: 'Finished Good',
        quantityFromParent: '-',
        level: 0,
        isCycle: false,
        children: [
          {
            key: 'child',
            productId: 'RM_100',
            productName: 'Raw Material',
            quantityFromParent: '2',
            level: 1,
            isCycle: false,
            children: [],
          },
        ],
      } as any,
    ];
    component.expandAllSimulation();
    expect(component.isExpanded({ key: 'root' } as any)).toBeTrue();
    component.toggleSimulationNode({ key: 'root', children: [{}] } as any);
    expect(component.isExpanded({ key: 'root' } as any)).toBeFalse();
    component.collapseAllSimulation();
    expect(component.trackSimulationNode(0, { key: 'root' } as any)).toBe('root');

    await (component as any).startSimulationBuild('');
    expect(component.simulationTree).toEqual([]);
    expect(component.simulationLoading).toBeFalse();

    component.isLoading.set(false);
    component.productId = '';
    component.components = [{ assocId: 11, seq: 1 } as any];
    component.loadBom('');
    expect(component.components).toHaveSize(1);
  });

  it('should build simulation trees, cache BOM lookups, and handle cycles', async () => {
    const responses: Record<string, any> = {
      ROOT: {
        productId: 'ROOT',
        productName: 'Root Item',
        components: [
          { productId: 'CHILD', quantity: 2 },
          { productId: 'ROOT', quantity: 1 },
        ],
      },
      CHILD: {
        productId: 'CHILD',
        productName: 'Child Item',
        components: [],
      },
    };
    manufacturingService.getBomDetail.and.callFake((productId: string) => {
      if (productId === 'BROKEN') {
        return throwError(() => new Error('boom'));
      }
      return of(responses[productId] || { productId, productName: productId, components: [] });
    });

    (component as any).simulationSeq = 1;
    const tree = await (component as any).buildSimulationTree('ROOT', 1);
    expect(tree).toHaveSize(1);
    expect(tree[0].productId).toBe('ROOT');
    expect(tree[0].children).toHaveSize(2);
    expect(tree[0].children[0].productId).toBe('CHILD');
    expect(tree[0].children[1].isCycle).toBeTrue();
    expect((component as any).collectExpandableNodeKeys(tree)).toEqual(['root:ROOT']);

    const cached = await (component as any).fetchBomDetailCached('ROOT');
    expect(cached?.productName).toBe('Root Item');
    const broken = await (component as any).fetchBomDetailCached('BROKEN');
    expect(broken).toBeNull();
  });
});
