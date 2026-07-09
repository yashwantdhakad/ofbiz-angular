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
export interface ShipmentDetail {
  shipmentId?: string;
  shipmentTypeId?: string;
  statusId?: string;
  shipmentMethodTypeId?: string;
  primaryOrderId?: string;
  primaryReturnId?: string;
  partyIdFrom?: string;
  partyIdTo?: string;
  originFacilityId?: string;
  destinationFacilityId?: string;
  estimatedShipDate?: string;
  estimatedArrivalDate?: string;
  createdDate?: string;
}

export interface ShipmentItem {
  shipmentItemSeqId?: string;
  shipmentItemSourceId?: string;
  orderId?: string;
  orderItemSeqId?: string;
  productId?: string;
  quantity?: number | string;
  quantityNotHandled?: number | string;
  shipmentContentDescription?: string;
  statusId?: string;
}

export interface ShipmentReceipt {
  receiptId?: string;
  returnId?: string;
  inventoryItemId?: string;
  productId?: string;
  quantityAccepted?: number | string;
  datetimeReceived?: string;
}

export interface ShipmentRouteSegment {
  shipmentRouteSegmentId?: string;
  routeSegSeqId?: string;
  originFacilityId?: string;
  destFacilityId?: string;
  shipmentMethodTypeId?: string;
  carrierPartyId?: string;
  carrierServiceStatusId?: string;
  destTelecom?: string;
  destPostal?: string;
}

export interface ShipmentStatusHistoryEntry {
  statusId?: string;
  statusDate?: string;
  changeByUserLoginId?: string;
}

export interface ShipmentDetailResponse {
  shipment?: ShipmentDetail | null;
  items?: ShipmentItem[];
  receipts?: ShipmentReceipt[];
  routeSegments?: ShipmentRouteSegment[];
  statuses?: ShipmentStatusHistoryEntry[];
  orderIds?: string[];
  invoiceIds?: string[];
}

export interface ShipmentTypeLookupItem {
  shipmentTypeId?: string;
  description?: string;
}

export interface ShipmentMethodTypeLookupItem {
  shipmentMethodTypeId?: string;
  description?: string;
}
