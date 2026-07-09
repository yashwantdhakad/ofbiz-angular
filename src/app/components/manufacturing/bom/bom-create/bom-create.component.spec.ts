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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { BomCreateComponent } from './bom-create.component';
import { TranslateService } from '@ngx-translate/core';

describe('BomCreateComponent', () => {
  let component: BomCreateComponent;
  let fixture: ComponentFixture<BomCreateComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let productService: jasmine.SpyObj<ProductService>;
  let router: jasmine.SpyObj<Router>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj('ManufacturingService', ['getProductAssocTypes', 'addProductAssoc', 'getWorkEfforts']);
    productService = jasmine.createSpyObj('ProductService', ['getProductsAutocompleteFromOms']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    manufacturingService.getProductAssocTypes.and.returnValue(of([
      { productAssocTypeId: 'MANUF_COMPONENT', description: 'Manufacturing Component' },
      { productAssocTypeId: 'UPSELL', description: 'Upsell' },
    ]));
    manufacturingService.getWorkEfforts.and.returnValue(of([] as any));
    manufacturingService.addProductAssoc.and.returnValue(of({}));
    productService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] }));
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [BomCreateComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: ProductService, useValue: productService },
        { provide: Router, useValue: router },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: MatDialog, useValue: dialog },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(BomCreateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(BomCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load BOM types and set default bomType', () => {
    expect(manufacturingService.getProductAssocTypes).toHaveBeenCalled();
    expect(component.bomTypes).toHaveSize(1);
    expect(component.form.get('bomType')?.value).toBe('MANUF_COMPONENT');
  });

  it('should add and remove BOM component row', () => {
    component.componentProductControl.setValue('RM_100');
    component.newItem.quantity = 3;
    component.addItem();
    expect(component.items).toHaveSize(1);

    component.removeItem(0);
    expect(component.items).toHaveSize(0);
  });

  it('should submit BOM and navigate to BOM detail', () => {
    component.form.patchValue({ item: 'FG_100', bomType: 'MANUF_COMPONENT' });
    component.items = [{ componentProductId: 'RM_100', quantity: 2, sequenceNum: '10', fromDate: null }];

    component.save();

    expect(manufacturingService.addProductAssoc).toHaveBeenCalledWith(
      'FG_100',
      jasmine.objectContaining({
        productIdTo: 'RM_100',
        productAssocTypeId: 'MANUF_COMPONENT',
        quantity: '2',
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/boms', 'FG_100']);
  });

  it('should set created parent product on the BOM item control', fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => of({ product: { productId: 'FG_101', productName: 'Finished Good 101' } }),
    } as any);

    component.addProduct('item');
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(component.form.get('item')?.value).toEqual(
      jasmine.objectContaining({ productId: 'FG_101', name: 'Finished Good 101' })
    );
  }));

  it('should set created component product on the component control', fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => of({ document: { productId: 'RM_101', name: 'Raw Material 101' } }),
    } as any);

    component.addProduct('component');
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(component.componentProductControl.value).toEqual(
      jasmine.objectContaining({ productId: 'RM_101', name: 'Raw Material 101' })
    );
  }));

  it('should save BOM after creating parent and component products from dialog-shaped objects', () => {
    component.form.patchValue({
      item: { product: { productId: 'FG_200', productName: 'Finished Good 200' } },
      bomType: 'MANUF_COMPONENT',
    });
    component.items = [{
      componentProductId: 'RM_200',
      quantity: 1,
      sequenceNum: '',
      fromDate: null,
    }];

    component.save();

    expect(manufacturingService.addProductAssoc).toHaveBeenCalledWith(
      'FG_200',
      jasmine.objectContaining({
        productIdTo: 'RM_200',
        productAssocTypeId: 'MANUF_COMPONENT',
      })
    );
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('MANUFACTURING.BOM_CREATE_SUCCESS');
  });

  it('should handle work effort load errors and expose display helpers', () => {
    manufacturingService.getWorkEfforts.and.returnValue(throwError(() => new Error('load failed')));

    component.ngOnInit();

    expect(component.operations).toEqual([]);
    expect(component.displayProduct('')).toBe('');
    expect(component.displayProduct('FG_1')).toBe('FG_1');
    expect(component.displayOperation('')).toBe('');
    expect(component.displayProduct({ productName: 'FG Name' })).toBe('FG Name');
    expect(component.displayOperation('OP_1')).toBe('OP_1');
    expect(component.displayOperation({ workEffortName: 'Cutting' })).toBe('Cutting');
    expect((component as any).toLocalDateTimeString('bad-date')).toBeNull();
    expect(component.trackByBomType(2, {})).toBe('2');
    expect(component.trackByWorkEffort(3, {})).toBe('3');
    expect(component.trackByProduct(4, {})).toBe('4');
  });

  it('should mark the form when save is attempted without parent, type, or items', () => {
    component.form.patchValue({ item: '', bomType: '' });
    component.componentProductControl.setValue('');

    component.save();

    expect(component.form.touched).toBeTrue();
    expect(manufacturingService.addProductAssoc).not.toHaveBeenCalled();
    expect(component.form.get('item')?.hasError('required')).toBeTrue();
    expect(component.form.get('bomType')?.hasError('required')).toBeTrue();
  });

  it('should handle BOM create failure and support operation filtering helpers', () => {
    component.operations = [
      { workEffortId: 'CUT-1', workEffortName: 'Cutting' },
      { workEffortId: 'PACK-1', workEffortName: 'Packing' },
    ];
    component.onOperationSelected({ workEffortId: 'CUT-1' });
    expect(component.form.get('operation')?.value).toBe('CUT-1');
    expect((component as any).filterOperations('cut')).toHaveSize(1);
    expect((component as any).filterOperations('')).toHaveSize(2);

    manufacturingService.addProductAssoc.and.returnValue(throwError(() => new Error('save failed')));
    component.form.patchValue({ item: 'FG_100', bomType: 'MANUF_COMPONENT' });
    component.items = [{ componentProductId: 'RM_100', quantity: 2, sequenceNum: '', fromDate: null }];

    component.save();

    expect(snackbarService.showError).toHaveBeenCalledWith('MANUFACTURING.BOM_CREATE_ERROR');
    expect(component.isSaving()).toBeFalse();
  });

  it('should filter autocomplete products and support helper no-op paths', fakeAsync(() => {
    productService.getProductsAutocompleteFromOms.and.returnValue(of({
      documentList: [
        { productId: 'FG_1', productName: 'Finished Good', isVirtual: 'N' },
        { productId: 'VIRT_1', productName: 'Virtual', isVirtual: 'Y' },
      ],
    }));

    let items: any[] | undefined;
    component.filteredItemProducts$.subscribe((result) => {
      items = result;
    });
    component.form.get('item')?.setValue('FG');
    tick(301);

    expect(items?.length).toBe(1);
    expect(items?.[0].productId).toBe('FG_1');

    component.componentProductControl.setValue('');
    component.addItem();
    expect(component.items).toHaveSize(0);

    component.removeItem(99);
    expect(component.items).toEqual([]);

    expect(component.displayProduct({ productId: 'FG_1' })).toBe('FG_1');
    expect(component.displayOperation({ workEffortId: 'OP_1' })).toBe('OP_1');
  }));

  it('should auto-add typed component on save and skip dismissed product dialogs', fakeAsync(() => {
    dialog.open.and.returnValues(
      { afterClosed: () => of({ productId: 'RM_300', productName: 'Raw Material 300' }) } as any,
      { afterClosed: () => of(null) } as any
    );

    component.form.patchValue({ item: 'FG_300', bomType: 'MANUF_COMPONENT' });
    component.componentProductControl.setValue('RM_300');

    component.addProduct('item');
    tick();
    expect(component.form.get('item')?.value).toEqual(
      jasmine.objectContaining({ productId: 'RM_300', productName: 'Raw Material 300' })
    );

    component.addProduct('component');
    tick();
    expect(component.componentProductControl.value).toBe('RM_300');

    component.items = [];
    component.componentProductControl.setValue('RM_400');
    component.save();

    expect(manufacturingService.addProductAssoc).toHaveBeenCalledWith(
      'RM_300',
      jasmine.objectContaining({
        productIdTo: 'RM_400',
        productAssocTypeId: 'MANUF_COMPONENT',
        quantity: '1',
        sequenceNum: undefined,
      })
    );
    expect(component.items).toHaveSize(1);
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('MANUFACTURING.BOM_CREATE_SUCCESS');
    expect(router.navigate).toHaveBeenCalledWith(['/boms', 'RM_300']);
  }));

  it('should support search fallback and mouse down close paths', fakeAsync(() => {
    productService.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('search failed')));
    const itemCloseSpy = jasmine.createSpy('closePanel');
    const componentCloseSpy = jasmine.createSpy('closePanel');
    component.itemAutocompleteTrigger = { closePanel: itemCloseSpy } as any;
    component.componentAutocompleteTrigger = { closePanel: componentCloseSpy } as any;
    const event = jasmine.createSpyObj<MouseEvent>('MouseEvent', ['preventDefault', 'stopPropagation']);

    let itemResults: any[] | undefined;
    component.filteredItemProducts$.subscribe((result) => {
      itemResults = result;
    });
    component.form.get('item')?.setValue('ERR');
    tick(301);

    expect(itemResults).toEqual([]);

    component.onAddProductMouseDown(event, 'item');
    component.onAddProductMouseDown(event, 'component');

    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
    expect(itemCloseSpy).toHaveBeenCalled();
    expect(componentCloseSpy).toHaveBeenCalled();
  }));

  it('should keep save in no-op state when product dialog is dismissed and validate empty submit state', () => {
    dialog.open.and.returnValues(
      { afterClosed: () => of(null) } as any,
      { afterClosed: () => of(null) } as any,
    );
    component.form.patchValue({ item: '', bomType: '' });
    component.componentProductControl.setValue('');

    component.addProduct('item');
    component.addProduct('component');
    component.save();

    expect(manufacturingService.addProductAssoc).not.toHaveBeenCalled();
    expect(component.form.get('item')?.value).toBe('');
    expect(component.componentProductControl.value).toBe('');
    expect(component.form.get('item')?.hasError('required')).toBeTrue();
    expect(component.form.get('bomType')?.hasError('required')).toBeTrue();
  });
});
