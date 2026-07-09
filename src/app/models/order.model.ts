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
import { PostalAddress } from './party.model';

export interface OrderHeaderSummary {
  [key: string]: any;
  orderId?: string;
  entryDate?: string;
  currencyUomId?: string;
  currencyUom?: string;
  statusId?: string;
  orderName?: string;
  externalId?: string;
  orderTypeId?: string;
}

export interface OrderStatusSummary {
  statusId?: string;
  description?: string;
}

export interface OrderStatusHistoryEntry {
  statusId?: string;
  description?: string;
  statusDescription?: string;
  orderItemSeqId?: string;
  statusDatetime?: string;
  statusUserLogin?: string;
  changeReason?: string;
}

export interface OrderNoteSummary {
  id?: string;
  noteText?: string;
  noteDate?: string;
  userId?: string;
  createdByName?: string;
}

export interface OrderTermSummary {
  termTypeId?: string;
  termValue?: string | number;
  termDays?: number;
}

export interface OrderPaymentPreferenceSummary {
  paymentMethodTypeId?: string;
  statusId?: string;
  maxAmount?: number;
}

export interface OrderIdentificationSummary {
  orderIdentificationTypeId?: string;
  idValue?: string;
}

export interface OrderAdjustmentSummary {
  orderAdjustmentTypeId?: string;
  amount?: number;
}

export interface OrderPartItemSummary {
  [key: string]: any;
  orderItemSeqId?: string;
  productId?: string;
  productName?: string;
  itemDescription?: string;
  description?: string;
  requiredByDate?: string;
  unitAmount?: number;
  quantity?: number;
  reservedQuantity?: number;
  issuedQuantity?: number;
  receivedQuantity?: number;
  backorderQuantity?: number;
  statusDescription?: string;
  totalAmount?: number;
  statusId?: string;
  components?: Array<{
    productId?: string;
    productName?: string;
  }>;
  product?: {
    productName?: string;
    internalName?: string;
  };
  itemType?: {
    description?: string;
    [key: string]: any;
  };
  orderItemTypeId?: string;
  itemTypeEnumId?: string;
}

export interface OrderPartSummary {
  [key: string]: any;
  orderPartSeqId?: string;
  vendorPartyId?: string;
  customerPartyId?: string;
  originFacilityId?: string;
  facilityId?: string;
  statusId?: string;
  carrierPartyId?: string;
  shipmentMethodTypeId?: string;
  carrierService?: string;
  shippingInstructions?: string;
  shipBeforeDate?: string;
  partTotal?: number;
  facility?: {
    facilityId?: string;
    facilityName?: string;
  };
  status?: {
    statusId?: string;
    description?: string;
  };
  vendor?: {
    organization?: {
      organizationName?: string;
    };
  };
  telecom?: {
    telecomNumber?: {
      countryCode?: string;
      areaCode?: string;
      contactNumber?: string;
    };
  };
  customer?: {
    partyId?: string;
    telecomNumber?: {
      countryCode?: string;
      areaCode?: string;
      contactNumber?: string;
    };
    person?: {
      firstName?: string;
      lastName?: string;
    };
    organization?: {
      organizationName?: string;
    };
  };
  items?: OrderPartItemSummary[];
}

export interface OrderContentSummary {
  contentId?: string;
  description?: string;
  contentDate?: string;
  contentLocation?: string;
}

export interface OrderDetailResponse {
  [key: string]: any;
  parts?: OrderPartSummary[];
  contents?: OrderContentSummary[];
}

export interface OrderContactMechSummary {
  contactMechId?: string;
  contactMechPurposeTypeId?: string;
  contactMechPurposeId?: string;
  postalAddress?: PostalAddress | null;
  telecomNumber?: {
    countryCode?: string;
    areaCode?: string;
    contactNumber?: string;
  };
}

export interface ShipmentSummary {
  shipmentId?: string;
  shipmentTypeId?: string;
  statusId?: string;
  statusDescription?: string;
  createdDate?: string;
  estimatedShipDate?: string;
  trackingNumber?: string;
  carrierTrackingCode?: string;
}

export interface InvoiceItemSummary {
  productId?: string;
  quantity?: number;
  amount?: number;
}

export interface InvoiceSummary {
  id?: string | number;
  invoiceId?: string;
  currencyUomId?: string;
  items?: InvoiceItemSummary[];
}

export interface ReturnSummary {
  returnId?: string;
  returnType?: string;
  status?: string;
  entryDate?: string;
  totalAmount?: number;
}

export interface OrderDisplayInfoResponse {
  [key: string]: any;
  orderHeader?: OrderHeaderSummary;
  statusItem?: OrderStatusSummary;
  orderStatusList?: OrderStatusHistoryEntry[];
  orderNoteList?: OrderNoteSummary[];
  firstPart?: OrderPartSummary;
  orderContactMechList?: OrderContactMechSummary[];
  orderAdjustmentList?: OrderAdjustmentSummary[];
  orderTermList?: OrderTermSummary[];
  orderPaymentPreferenceList?: OrderPaymentPreferenceSummary[];
  relatedOrderPrimaryId?: number | null;
  relatedOrderId?: string | null;
  relatedOrderTypeId?: string | null;
  facilityAddress?: PostalAddress;
  originFacilityAddress?: PostalAddress;
  shipments?: ShipmentSummary[];
  invoices?: InvoiceSummary[];
  returns?: ReturnSummary[];
  firstPartInfo?: OrderPartSummary;
  picklists?: any[];
  reservationStatus?: any;
  currencyInfo?: {
    transactionCurrencyUomId?: string;
    baseCurrencyUomId?: string;
    exchangeRate?: number;
  };
  vendorTaxProfile?: {
    gstReverseChargeApplicable?: boolean;
    tdsSection195Percent?: number;
  };
}

export interface StatusLookupItem {
  statusId?: string;
  statusIdTo?: string;
  description?: string;
  transitionName?: string;
}

export interface ShipmentTypeLookupItem {
  shipmentTypeId?: string;
  description?: string;
}

export interface OrderItemTypeLookupItem {
  orderItemTypeId?: string;
  description?: string;
}

export interface OrderListResponse {
  resultList?: OrderHeaderSummary[];
  documentList?: OrderHeaderSummary[];
  documentListCount?: number;
  totalCount?: number;
  orderList?: OrderHeaderSummary[];
  orderListCount?: number;
}

export interface VendorLookupItem {
  partyId?: string;
  groupName?: string;
  value?: string;
  label?: string;
}

export interface FacilityLookupItem {
  facilityId?: string;
  facilityName?: string;
  label?: string;
  [key: string]: unknown;
}

export interface OrderNotePayload {
  orderId?: string;
  noteId?: string;
  noteText?: string;
  noteDate?: string;
}

export interface OrderItemQuantityPayload {
  quantity: number;
  unitAmount?: number;
  requiredByDate?: Date | string;
}
