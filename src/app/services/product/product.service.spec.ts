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
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'put',
      'delete',
      'getWms',
      'getOms',
      'postWms',
      'putWms',
      'deleteWms',
      'postWmsFormData',
      'getWmsBlob',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ProductService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(ProductService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch products and map display names', () => {
    apiServiceSpy.get.and.returnValue(of({
      data: {
        documentList: [
          { productId: 'P100', productName: 'Test Product' },
          { productId: 'P200', name: 'Fallback Name' },
          { productId: 'P300' },
        ],
      },
    } as any));

    service.getProducts(0, 'Test').subscribe((data) => {
      expect(data.documentList).toEqual([
        jasmine.objectContaining({ productId: 'P100', name: 'Test Product' }),
        jasmine.objectContaining({ productId: 'P200', name: 'Fallback Name' }),
        jasmine.objectContaining({ productId: 'P300', name: 'P300' }),
      ]);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/products?page=0&query=Test');
  });

  it('should fetch sorted product lists and oms autocomplete data', () => {
    apiServiceSpy.get.and.returnValue(of({
      data: {
        documentList: [{ productId: 'P100', name: 'Alpha' }],
      },
    } as any));
    service.getProducts(2, 'Widget', 'name', 'asc').subscribe((data) => {
      expect(data.documentList?.[0].name).toBe('Alpha');
    });

    apiServiceSpy.get.and.returnValue(of({
      data: { documentList: [{ productId: 'P200', productName: 'Beta' }] },
    } as any));
    service.getProductsAutocompleteFromOms('Auto', 5).subscribe((data) => {
      expect(data.documentList?.[0].name).toBe('Beta');
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/products?page=2&query=Widget&sortBy=name&sortDirection=asc');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/intra/products/autocomplete?query=Auto&limit=5');
  });

  it('should fetch products by ids and short-circuit empty input', () => {
    apiServiceSpy.get.and.returnValue(of({
      data: {
        documentList: [
          { productId: 'P1', productName: 'Product 1' },
          { productId: 'P2', name: 'Product 2' },
        ],
      },
    } as any));

    service.getProductsByIds(['P1', '', 'P2', 'P1']).subscribe((data) => {
      expect(data).toEqual([
        jasmine.objectContaining({ productId: 'P1', name: 'Product 1' }),
        jasmine.objectContaining({ productId: 'P2', name: 'Product 2' }),
      ]);
    });
    service.getProductsByIds([]).subscribe((data) => {
      expect(data).toEqual([]);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/products?productIds=P1%2CP2');
  });

  it('should create, fetch, update, and delete product records', () => {
    const createPayload = { name: 'p1' };
    const updatePayload = { productId: 'P1' };
    apiServiceSpy.post.and.returnValue(of({ data: { productId: 'P1' } }));
    apiServiceSpy.get.and.returnValue(of({ data: { productId: 'P1' } } as any));
    apiServiceSpy.put.and.returnValue(of({ data: { ok: true } } as any));
    apiServiceSpy.delete.and.returnValue(of({ data: { ok: true } } as any));

    service.createProduct(createPayload).subscribe();
    service.getProduct('P 1').subscribe();
    service.updateProduct(updatePayload as any).subscribe();
    service.deleteProduct('P1').subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/products', createPayload);
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/products/P%201');
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/products/P1', updatePayload as any);
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/products/P1');
  });

  it('should manage product prices categories and associations', () => {
    apiServiceSpy.post.and.returnValue(of({ data: { ok: true } } as any));
    apiServiceSpy.put.and.returnValue(of({ data: { ok: true } } as any));
    apiServiceSpy.delete.and.returnValue(of({ data: { ok: true } } as any));

    service.addProductPrice({ productId: 'P1' }).subscribe();
    service.updateProductPrice({ productId: 'P1', productPriceId: 'PP1' }).subscribe();
    service.deleteProductPrice({ productId: 'P1', productPriceId: 'PP1' } as any).subscribe();
    service.addProductCategory({ productId: 'P1' }).subscribe();
    service.createProductAssoc({ productId: 'P1', assoc: true }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/products/P1/prices', { productId: 'P1' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/products/P1/prices/PP1', { productId: 'P1', productPriceId: 'PP1' });
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/products/P1/prices/PP1');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/products/P1/categories', { productId: 'P1' });
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/products/P1/assocs', { productId: 'P1', assoc: true });
  });

  it('should cover product inventory shipping and content endpoints', () => {
    apiServiceSpy.getWms.and.returnValue(of([{ atpTotal: 10 }] as any));
    apiServiceSpy.get.and.returnValues(
      of({ data: { productId: 'P1', shipPackSize: 2 } } as any),
      of({ data: { fileBytes: btoa('x'), mimeType: 'text/plain' } } as any)
    );
    apiServiceSpy.put.and.returnValue(of({ data: { productId: 'P1' } } as any));
    apiServiceSpy.postWmsFormData.and.returnValue(of({ productId: 'P1' } as any));

    service.getInventorySummary('P 1').subscribe((data) => {
      expect(data).toEqual([{ atpTotal: 10 }] as any);
    });
    service.getProductShippingConfig('P 1').subscribe((data) => {
      expect(data).toEqual({ productId: 'P1', shipPackSize: 2 } as any);
    });
    service.upsertProductShippingConfig('P 1', { shipPackSize: 2 } as any).subscribe();
    service.createProductContent('P1', new FormData()).subscribe();
    service.downloadProductContent('P 1', 'C 1').subscribe((data) => {
      expect(data).toBeInstanceOf(Blob);
      expect(data.type).toBe('text/plain');
    });

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/inventory-items/summary?productId=P%201');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/products/P%201/shipping-config');
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/products/P%201/shipping-config', { shipPackSize: 2 } as any);
    expect(apiServiceSpy.postWmsFormData).toHaveBeenCalledWith('/common/products/P1/contents', jasmine.any(FormData));
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/products/P%201/contents/C%201');
  });

  it('should map product assoc types and manage good identifications', () => {
    apiServiceSpy.get.and.returnValues(
      of({ data: { resultList: [{ productAssocTypeId: 'ACCESSORY' }] } } as any),
      of({ data: { resultList: [{ goodIdentificationId: 1 }] } } as any),
      of({ data: { resultList: [{ goodIdentificationTypeId: 'SKU' }] } } as any)
    );
    apiServiceSpy.post.and.returnValue(of({ data: { id: 1 } } as any));
    apiServiceSpy.put.and.returnValue(of({ data: { id: 2 } } as any));
    apiServiceSpy.delete.and.returnValue(of({ data: { ok: true } } as any));

    service.getProductAssocTypes().subscribe((data) => {
      expect(data).toEqual([jasmine.objectContaining({ productAssocTypeId: 'ACCESSORY', enumId: 'ACCESSORY' })]);
    });
    service.getGoodIdentifications('P 1').subscribe((data) => {
      expect(data).toEqual([{ goodIdentificationId: 1 }] as any);
    });
    service.createGoodIdentification({ goodIdentificationTypeId: 'SKU' } as any).subscribe();
    service.updateGoodIdentification(7, { goodIdentificationTypeId: 'UPC' } as any).subscribe();
    service.deleteGoodIdentification(7).subscribe();
    service.getGoodIdentificationTypes().subscribe((data) => {
      expect(data).toEqual([{ goodIdentificationTypeId: 'SKU' }] as any);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/product-assoc-types');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/good-identifications?productId=P%201');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/good-identifications', { goodIdentificationTypeId: 'SKU' } as any);
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/good-identifications/7', { goodIdentificationTypeId: 'UPC' } as any);
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/good-identifications/7');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/good-identification-types');
  });
});
