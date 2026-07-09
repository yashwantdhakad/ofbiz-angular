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
export interface LotSummary {
  lotId?: string;
  creationDate?: string;
  quantity?: number;
  expirationDate?: string;
  heatNumber?: string;
  steelGrade?: string;
  millCertNumber?: string;
  manufacturer?: string;
  yieldStrength?: number;
}

export interface Lot extends LotSummary {
  id?: number;
  [key: string]: unknown;
}

export interface LotInventoryItem {
  inventoryItemId?: string;
  productId?: string;
  facilityId?: string;
  locationSeqId?: string;
  statusId?: string;
  containerId?: string;
  atpQoh?: number;
  receivedDate?: string;
  availableToPromiseTotal?: number;
  quantityOnHandTotal?: number;
  datetimeReceived?: string;
  parentInventoryItemId?: string;
}

export interface LotDetailResponse {
  lot?: Lot;
  inventoryItems?: LotInventoryItem[];
}

export interface LotListResponse {
  resultList?: LotSummary[];
  documentListCount?: number;
}

export interface LotCreatePayload {
  lotId?: string;
  expirationDate?: string | null;
  creationDate?: string;
  quantity?: number;
  heatNumber?: string;
  steelGrade?: string;
  millCertNumber?: string;
  manufacturer?: string;
  yieldStrength?: number;
}

export type LotUpdatePayload = Partial<Lot>;

// ── Lot Attribute ─────────────────────────────────────────────────────
export interface LotAttribute {
  attrName: string;
  attrValue?: string;
  attrDescription?: string;
}

// ── Inventory Item With Lot Fields ────────────────────────────────────
export interface InventoryItemWithLot {
  inventoryItemId?: string;
  productId?: string;
  lotId?: string;
  heatNumber?: string;
  steelGrade?: string;
  millCertNumber?: string;
  manufacturer?: string;
  yieldStrength?: number;
  facilityId?: string;
  locationSeqId?: string;
  parentInventoryItemId?: string;
  quantityOnHandTotal?: number;
}

// ── Steel Cutting ─────────────────────────────────────────────────────
export interface CutSectionEntry {
  serialNumber: string;
  productId: string;
  sectionType?: 'CUT_SECTION' | 'SCRAP';
  lengthMm?: string;
  widthMm?: string;
  thicknessMm?: string;
  weightKg?: string;
}

export interface SteelCuttingPayload {
  workEffortId?: string;
  sourcePlateInventoryItemId: string;
  cutSections: CutSectionEntry[];
}

export interface SteelCuttingResult {
  generatedInventoryItemIds?: string[];
}

// ── Traceability Tree ─────────────────────────────────────────────────
export interface TraceabilityChildNode {
  inventoryItemId?: string;
  productId?: string;
  serialNumber?: string;
  statusId?: string;
  nodeType?: 'CUT_SECTION' | 'SCRAP';
}

export interface TraceabilityParentNode {
  inventoryItemId?: string;
  productId?: string;
  serialNumber?: string;
  statusId?: string;
  quantityOnHandTotal?: number;
  children?: TraceabilityChildNode[];
}

export interface TraceabilityLotNode {
  lotId?: string;
  heatNumber?: string;
  steelGrade?: string;
  millCertNumber?: string;
  manufacturer?: string;
  yieldStrength?: number;
  creationDate?: string;
}

export interface TraceabilityTree {
  lot?: TraceabilityLotNode;
  parentPlates?: TraceabilityParentNode[];
}
