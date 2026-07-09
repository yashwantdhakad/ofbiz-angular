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
import { of, throwError } from 'rxjs';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { BomsComponent } from './boms.component';

describe('BomsComponent', () => {
  let component: BomsComponent;
  let fixture: ComponentFixture<BomsComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj('ManufacturingService', ['getProductAssocTypes', 'getBoms']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask', 'defer', 'markForCheck', 'detectChanges']);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.defer.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.markForCheck.and.stub();
    renderSchedulerSpy.detectChanges.and.stub();
    manufacturingService.getProductAssocTypes.and.returnValue(of([
      { productAssocTypeId: 'MANUF_COMPONENT', description: 'Manufacturing Component' },
      { productAssocTypeId: 'CROSS_SELL', description: 'Cross Sell' },
    ]));
    manufacturingService.getBoms.and.returnValue(of({
      documentList: [{ productId: 'FG_100', productName: 'Finished Good', bomTypeId: 'MANUF_COMPONENT' }],
      documentListCount: 1,
    }));

    await TestBed.configureTestingModule({
      declarations: [BomsComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BomsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load BOM types and BOM list on init', () => {
    expect(manufacturingService.getProductAssocTypes).toHaveBeenCalled();
    expect(manufacturingService.getBoms).toHaveBeenCalled();
    expect(component.bomTypes()).toHaveSize(1);
    expect(component.boms()).toHaveSize(1);
  });

  it('should apply filters by resetting to page 1', () => {
    component.pagination.update(s => ({ ...s, page: 3 }));
    component.applyFilters();
    expect(component.pagination().page).toBe(1);
  });

  it('should clear filters and reload', () => {
    component.productFilter.set('chair');
    component.selectedBomType.set('MANUF_COMPONENT');
    spyOn(component, 'loadBoms');
    component.clearFilters();
    expect(component.productFilter()).toBe('');
    expect(component.selectedBomType()).toBe('');
    expect(component.loadBoms).toHaveBeenCalled();
  });

  it('should handle bom type loading failure', () => {
    manufacturingService.getProductAssocTypes.and.returnValue(throwError(() => new Error('failed')));
    component.loadBomTypes();
    expect(component.bomTypes()).toEqual([]);
  });

  it('should handle list load failure and helper branches', () => {
    manufacturingService.getBoms.and.returnValue(throwError(() => new Error('failed')));
    spyOn(console, 'error');

    component.loadBoms();

    expect(console.error).toHaveBeenCalled();
    expect(component.boms()).toEqual([]);
    expect(component.pages()).toBe(0);
    expect(component.isLoading()).toBeFalse();
    expect(component.trackByBomType(2, {})).toBe('2');
    expect((component as any).isBomType('MANUF_BOM')).toBeTrue();
    expect((component as any).isBomType('PART_COMPONENT')).toBeTrue();
    expect((component as any).isBomType('OTHER')).toBeFalse();
    expect((component as any).extractItems([{ productId: 'FG_1' }])).toEqual([{ productId: 'FG_1' }]);
    expect((component as any).extractItems({ documentList: [{ productId: 'FG_2' }] })).toEqual([{ productId: 'FG_2' }]);
    expect((component as any).extractItems({ resultList: [{ productId: 'FG_3' }] })).toEqual([{ productId: 'FG_3' }]);
    expect((component as any).extractItems({ responseMap: { resultList: [{ productId: 'FG_4' }] } })).toEqual([{ productId: 'FG_4' }]);
    expect((component as any).extractItems({ content: [{ productId: 'FG_5' }] })).toEqual([{ productId: 'FG_5' }]);
    expect((component as any).extractItems(null)).toEqual([]);
    expect((component as any).extractTotal({ documentListCount: 11 })).toBe(11);
    expect((component as any).extractTotal({ totalElements: 12 })).toBe(12);
    expect((component as any).extractTotal({ responseMap: { total: 13 } })).toBe(13);
    expect((component as any).extractTotal({ content: [{ productId: 'FG_6' }] })).toBe(1);
  });

  it('should handle alternate response shapes and pagination change', () => {
    manufacturingService.getBoms.and.returnValue(of({
      responseMap: {
        resultList: [{ productId: 'FG_200', productName: 'Alt Product', bomTypeId: 'COMPONENT' }],
        total: 7,
      },
    } as any));

    component.onPageChange(3);

    expect(component.pagination().page).toBe(4);
    expect(component.boms()[0].bomId).toBe('FG_200');
    expect(component.pages()).toBe(7);
  });

  it('should keep page reset behavior and no-op branches covered', () => {
    component.pagination.update((state) => ({ ...state, page: 4, rowsPerPage: 20 }));
    spyOn(component, 'loadBoms');

    component.applyFilters();
    expect(component.pagination().page).toBe(1);
    expect(component.loadBoms).toHaveBeenCalled();

    component.clearFilters();
    expect(component.productFilter()).toBe('');
    expect(component.selectedBomType()).toBe('');
    expect(component.pagination().page).toBe(1);

    component.onPageChange(0);
    expect(component.pagination().page).toBe(1);
  });
});
