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
export interface LookupOption {
  [key: string]: unknown;
  description?: string;
}

export interface ProductTypeLookupOption extends LookupOption {
  productTypeId?: string;
}

export interface ProductCategoryTypeLookupOption extends LookupOption {
  productCategoryTypeId?: string;
}

export interface ProductPriceTypeLookupOption extends LookupOption {
  productPriceTypeId?: string;
}

export interface ProductPricePurposeLookupOption extends LookupOption {
  productPricePurposeId?: string;
}

export interface ProductAssocTypeOption extends LookupOption {
  enumId?: string;
  productAssocTypeId?: string;
}

export interface ProductSummary {
  productId?: string;
  productName?: string;
  internalName?: string;
  description?: string;
  name?: string;
}

export interface ProductDetail extends ProductSummary {
  productTypeId?: string;
  taxable?: string | boolean;
  returnable?: string | boolean;
  includeInPromotions?: string | boolean;
  serialized?: string | boolean;
  requireInspection?: string | boolean;
}

export interface ProductPrice {
  productId?: string;
  productPriceId?: string;
  productPriceTypeId?: string;
  productPricePurposeId?: string;
  price?: number | string;
  currencyUomId?: string;
  fromDate?: string;
  thruDate?: string;
}

export interface ProductCategory {
  productId?: string;
  productCategoryId?: string;
  categoryName?: string;
  productCategoryTypeId?: string;
  fromDate?: string;
}

export interface ProductContentRecord {
  productId?: string;
  contentId?: string;
  description?: string;
  contentLocation?: string;
}

export interface ProductAssociation {
  productId?: string;
  productIdTo?: string;
  toProductId?: string;
  productName?: string;
  toProductName?: string;
  productAssocTypeId?: string;
  productAssocTypeEnumId?: string;
  sequenceNum?: number | string;
  quantity?: number | string;
  fromDate?: string;
  thruDate?: string;
  scrapFactor?: number | string;
  instruction?: string;
  type?: {
    description?: string;
  };
  product?: ProductSummary & { productId?: string };
  toProduct?: ProductSummary & { productId?: string };
}

export interface ProductInventorySummary {
  facilityId?: string;
  facilityName?: string;
  atpTotal?: number | string;
  qohTotal?: number | string;
}

export interface SupplierProductRecord {
  id?: string | number;
  partyId?: string;
  supplierProductName?: string;
  lastPrice?: number | string;
}

export interface ProductFeatureRecord {
  id?: string | number;
  productFeatureId?: string;
  featureDescription?: string;
  featureAbbrev?: string;
  productFeatureApplTypeId?: string;
  sequenceNum?: number | string;
  fromDate?: string;
}

export interface ProductFacilityLocation {
  id?: string | number;
  facilityId?: string;
  locationSeqId?: string;
  locationName?: string;
  minimumStock?: number | string;
  moveQuantity?: number | string;
  reorderQuantity?: number | string;
  maximumStock?: number | string;
}

export interface ProductFacilityRecord {
  id?: string | number;
  facilityId?: string;
  facilityName?: string;
  minimumStock?: number | string;
  reorderQuantity?: number | string;
  daysToShip?: number | string;
}

export interface ProductFacilityView extends ProductFacilityRecord {
  locations: ProductFacilityLocation[];
  expanded: boolean;
}

export interface ProductIdentificationType {
  goodIdentificationTypeId?: string;
  description?: string;
}

export interface ProductIdentification {
  id?: number;
  productId?: string;
  goodIdentificationTypeId?: string;
  idValue?: string;
}

export interface ProductShippingConfig {
  shippable?: boolean;
  inShipBox?: boolean;
  productHeight?: number | string;
  productWidth?: number | string;
  productDepth?: number | string;
  productWeight?: number | string;
  shippingHeight?: number | string;
  shippingWidth?: number | string;
  shippingDepth?: number | string;
  shippingWeight?: number | string;
}

export interface ProductDetailResponse {
  product?: ProductDetail | null;
  prices?: ProductPrice[];
  categories?: ProductCategory[];
  contents?: ProductContentRecord[];
  assocs?: ProductAssociation[];
  toAssocs?: ProductAssociation[];
  inventorySummary?: ProductInventorySummary[];
  identifications?: ProductIdentification[];
  supplierProducts?: SupplierProductRecord[];
  productFeatures?: ProductFeatureRecord[];
  productFacilities?: ProductFacilityRecord[];
  productFacilityLocations?: ProductFacilityLocation[];
  facilityNames?: Record<string, string>;
  shippingConfig?: ProductShippingConfig | null;
}

export interface ProductListResponse<TItem = ProductSummary> {
  documentList?: TItem[];
  [key: string]: unknown;
}

export interface ProductAutocompleteItem extends ProductSummary {
  productId?: string;
  unitPrice?: number | string;
  atpTotal?: number | string;
  availableToPromiseTotal?: number | string;
  supplierLastPrice?: number | string;
  lastPrice?: number | string;
}

export interface ProductContentDialogData {
  productId: string;
  description?: string;
}

export interface ProductPriceDialogData extends ProductPrice {
  productId?: string;
  priceTypeEnums?: ProductPriceTypeLookupOption[];
  pricePurposeEnums?: ProductPricePurposeLookupOption[];
}

export interface ProductCategoryDialogData {
  productId?: string;
  productCategoryId?: string;
  categoryName?: string;
}

export interface ProductAssocDialogData extends ProductAssociation {
  productId?: string;
}

export interface ProductFeatureDialogData extends ProductFeatureRecord {
  productId?: string;
  isNew?: boolean;
}

export interface ProductFacilityDialogData {
  productId: string;
  productFacility?: ProductFacilityRecord;
}

export interface ProductFacilityLocationDialogData {
  productId: string;
  facilityId: string;
  facilityName?: string;
  productFacilityLocation?: ProductFacilityLocation;
}

export interface DeleteProductPricePayload {
  productId: string;
  productPriceId: string;
}

export interface ProductUpdatePayload {
  productId: string;
  taxable?: string;
  returnable?: string;
  includeInPromotions?: string;
  serialized?: string;
  requireInspection?: string;
}
