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
import { FacilityDetail } from './facility.model';
import { ProductAutocompleteItem } from './product.model';

export type DateInput = string | number | Date | null;
export type NumericInput = number | string | null;
export type DateRangeValue = Date | string | null;

export interface JobDetailState {
  [key: string]: unknown;
  workEffortId?: string;
  workEffortName?: string;
  currentStatusId?: string;
  statusId?: string;
  facilityId?: string;
  sourceReferenceId?: string;
  estimatedStartDate?: string;
  actualStartDate?: string;
  estimatedWorkDuration?: number | string;
  estimatedMilliSeconds?: number | string;
  assignedWorkerPartyId?: string;
  assignedWorkerName?: string;
}

export interface JobProductLine {
  [key: string]: unknown;
  id?: number;
  productId?: string;
  productName?: string;
  estimatedQuantity?: number | string;
  produced?: number | string;
  availableToPromiseTotal?: number | string;
  quantityOnHandTotal?: number | string;
  uom?: string;
  remainingQuantity?: number | string;
  reservedQuantity?: number | string;
  issuedQuantity?: number | string;
  statusId?: string;
}

export interface JobTaskLine {
  [key: string]: unknown;
  workEffortId?: string;
  workEffortName?: string;
  sourceReferenceId?: string;
  currentStatusId?: string;
  facilityId?: string;
  estimatedStartDate?: string;
  estimatedMilliSeconds?: number | string;
  actualStartDate?: string;
  actualCompletionDate?: string;
  actualHours?: number | null;
  actualSetupHours?: number | null;
}

export interface JobReferenceLine {
  [key: string]: unknown;
  id?: string;
  type?: string;
  producedItem?: string;
  status?: string;
  price?: number | string;
}

export interface JobProducedItem {
  [key: string]: unknown;
  inventoryItemId?: string;
  lotId?: string;
  locationSeqId?: string;
  itemCondition?: string;
  producedInventoryItemIds?: string;
  qty?: number | string;
  unitCost?: number | string;
  total?: number | string;
  totalCost?: number | string;
  receivedOn?: DateInput;
  expireDate?: DateInput;
  availableToPromiseTotal?: number | string;
  quantityOnHandTotal?: number | string;
}

export interface JobIssuedMaterial {
  [key: string]: unknown;
  itemIssuanceId?: string;
  id?: number;
  remainingQuantity?: number | string;
  estimatedQuantity?: number | string;
  issuedQuantity?: number | string;
  reservedQuantity?: number | string;
  statusId?: string;
  productId?: string;
  productName?: string;
  inventoryItemId?: string;
  location?: string;
  issued?: number | string;
  returned?: number | string;
  issuedOn?: DateInput;
  returnedOn?: DateInput;
}

export interface JobContentRecord {
  [key: string]: unknown;
  id?: number;
  contentId?: string;
  contentName?: string;
  description?: string;
  workEffortContentTypeId?: string;
  fromDate?: string;
}

export interface JobNoteRecord {
  [key: string]: unknown;
  id?: number;
  workEffortId?: string;
  noteId?: string;
  noteText?: string;
  internalNote?: string;
}

export interface JobNotePayload {
  noteText: string;
}

export interface JobExecutionChecklistItem {
  [key: string]: unknown;
  id?: number;
  workEffortId?: string;
  category?: string;
  statusId?: string;
  quantity?: number | string;
  note?: string;
  userLoginId?: string;
  recordedAt?: string;
}

export interface JobExecutionChecklistPayload {
  category: string;
  statusId: string;
  quantity?: NumericInput;
  note?: string | null;
}

export interface JobStatusHistoryEntry {
  [key: string]: unknown;
  statusId?: string;
  statusDatetime?: string;
  setByUserLogin?: string;
  reason?: string;
}

export interface JobDetailResponse {
  [key: string]: unknown;
  job?: JobDetailState;
  workEffort?: JobDetailState;
  consumeList?: JobProductLine[];
  produceList?: JobProductLine[];
  tasks?: JobTaskLine[];
  references?: JobReferenceLine[];
  producedItems?: JobProducedItem[];
  issuedMaterials?: JobIssuedMaterial[];
  contents?: JobContentRecord[];
  notes?: JobNoteRecord[];
  executionChecklist?: JobExecutionChecklistItem[];
  statusHistory?: JobStatusHistoryEntry[];
}

export interface JobCostLine {
  id?: number;
  inventoryItemId?: string;
  productId?: string;
  productName?: string;
  quantity?: number | string;
  unitCost?: number | string;
  lineCost?: number | string;
  cost?: number | string;
  costComponentTypeId?: string;
  description?: string;
  currencyUomId?: string;
  fromDate?: string;
}

export interface JobCostSummary {
  materialCostLines?: JobCostLine[];
  laborCostLines?: JobCostLine[];
  miscCostLines?: JobCostLine[];
  materialCostTotal?: number | string;
  laborCostTotal?: number | string;
  miscCostTotal?: number | string;
  totalCost?: number | string;
}

export interface AddJobCostPayload {
  costComponentTypeId: string;
  description?: string;
  cost: number;
  currencyUomId?: string;
}

export interface AssignWorkerDialogResult {
  partyId: string;
}

export interface AddJobContentDialogResult {
  formData: FormData;
  workEffortContentTypeId: string;
}

export interface WorkEffortLookupItem {
  [key: string]: unknown;
  id?: number;
  workEffortId?: string;
  workEffortName?: string;
  description?: string;
  workEffortPurposeTypeId?: string;
}

export interface RoutingDetailData {
  workEffortId?: string;
  workEffortName?: string;
  description?: string;
  statusId?: string;
  estimatedStartDate?: string;
  estimatedCompletionDate?: string;
  quantityToProduce?: number | string;
}

export interface RoutingOperation {
  workEffortId?: string;
  operationWorkEffortId?: string;
  workEffortName?: string;
  sequenceNum?: string | number;
  name?: string;
  description?: string;
  estimatedSetupMillis?: string | number;
  estimatedMilliSeconds?: string | number;
  fromDate?: string;
  thruDate?: string;
}

export interface RoutingDeliverableItem {
  id?: number;
  productId?: string;
  productName?: string;
  estimatedQuantity?: number | string;
  quantity?: number | string;
  fromDate?: string;
  thruDate?: string;
}

export interface RoutingContent {
  id?: number;
  contentId?: string;
  contentName?: string;
  description?: string;
  workEffortContentTypeId?: string;
  fromDate?: string;
}

export interface RoutingApiPayload {
  routing?: RoutingDetailData;
  operations?: RoutingOperation[];
  deliverableItems?: RoutingDeliverableItem[];
  contents?: RoutingContent[];
  responseMap?: RoutingApiPayload;
  result?: RoutingApiPayload;
  data?: RoutingApiPayload;
}

export type RoutingApiResponse = RoutingApiPayload;

export interface AddRoutingContentDialogResult {
  formData: FormData;
  workEffortContentTypeId: string;
}

export interface EditRoutingDialogData {
  routing: RoutingDetailData | null;
}

export interface EditRoutingDialogResult {
  workEffortName: string;
  description?: string | null;
  quantityToProduce?: NumericInput;
}

export interface AddOperationDialogData {
  sequenceNum?: string;
}

export interface AddOperationDialogResult {
  operationWorkEffortId: string;
  sequenceNum?: string | number | null;
  fromDate?: DateRangeValue;
  thruDate?: DateRangeValue;
}

export interface AddDeliverableItemDialogData {
  item?: RoutingDeliverableItem;
}

export interface AddDeliverableItemDialogResult {
  productId: string;
  estimatedQuantity?: NumericInput;
  fromDate?: DateRangeValue;
  thruDate?: DateRangeValue;
}

export interface RoutingContentDialogData {
  contentType?: string;
}

export interface OperationDetailData {
  id?: number;
  workEffortId?: string;
  workEffortName?: string;
  description?: string;
  workEffortTypeId?: string;
  workEffortPurposeTypeId?: string;
  workEffortPurposeTypeDescription?: string;
  facilityId?: string;
  facilityName?: string;
  fixedAssetId?: string;
  fixedAssetName?: string;
  estimatedSetupMillis?: string | number;
  estimatedMilliSeconds?: string | number;
  reservPersons?: string | number;
  currentStatusId?: string;
  statusDescription?: string;
}

export interface OperationDetailResponse {
  operation?: OperationDetailData | null;
  routings?: RoutingDetailData[];
}

export interface FacilityReferenceItem extends FacilityDetail {
  label?: string;
}

export interface EditOperationDialogData {
  operation: OperationDetailData;
  facilities: FacilityReferenceItem[];
}

export interface EditOperationDialogResult {
  workEffortName: string;
  description?: string;
  facilityId?: string;
  fixedAssetId?: string;
  workEffortPurposeTypeId?: string;
  estimatedSetupMillis?: string | number;
  estimatedMilliSeconds?: string | number;
  reservPersons?: string | number;
  currentStatusId?: string;
}

export interface DeliverableProductAutocompleteItem extends ProductAutocompleteItem {
  productId?: string;
}

export interface WorkEffortListResponse {
  resultList?: WorkEffortLookupItem[];
  documentList?: WorkEffortLookupItem[];
  documentListCount?: number;
  totalElements?: number;
}

export interface BomComponent {
  productId?: string;
  productName?: string;
  quantity?: number | string;
  uomId?: string;
}

export interface BomDetail {
  productId?: string;
  productName?: string;
  internalName?: string;
  bomTypeId?: string;
  bomTypeLabel?: string;
  revisionNumber?: string;
  revisionStatus?: string;
  revisionUpdatedAt?: string;
  revisionNote?: string;
  components?: BomComponent[];
  documents?: BomDocumentRecord[];
  [key: string]: unknown;
}

export interface BomDocumentRecord {
  contentId?: string;
  description?: string;
  productContentTypeEnumId?: string;
  contentLocation?: string;
}

export interface BomListResponse {
  resultList?: BomDetail[];
  documentList?: BomDetail[];
  documentListCount?: number;
}
