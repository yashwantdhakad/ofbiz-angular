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
export interface Party {
    partyId: string;
    statusId?: string;
    externalId?: string;
    preferredCurrencyUomId?: string;
    description?: string;
    createdDate?: string;
    createdByUserLogin?: string;
    lastModifiedDate?: string;
    lastModifiedByUserLogin?: string;
    firstName?: string;
    lastName?: string;
    groupName?: string;
}

export interface PartyRole {
    partyId?: string;
    partyRoleId?: string;
    roleTypeId?: string;
    roleType?: string;
    description?: string;
    roleTypeDescription?: string;
}

export interface ContactMech {
    contactMechId?: string;
    contactMechPurposeId?: string;
    fromDate?: string;
    toDate?: string;
}

export interface PostalAddress extends ContactMech {
    postalAddressId?: string;
    toName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    postalCode?: string;
    countryGeoId?: string;
    stateProvinceGeoId?: string;
    stateProvinceGeo?: {
        geoName?: string;
    };
    geoName?: string; // State name often separate
}

export interface TelecomNumber extends ContactMech {
    countryCode?: string;
    areaCode?: string;
    contactNumber?: string;
}

export interface EmailAddress extends ContactMech {
    emailAddress?: string;
}

export interface PartyIdentification {
    partyId?: string;
    partyIdentificationTypeId?: string;
    idValue?: string;
    description?: string; // Added description
}

export interface PartyClassification {
    partyId?: string;
    partyClassificationGroupId?: string;
    classificationTypeEnumId?: string;
    fromDate?: string;
    toDate?: string;
    typeDescription?: string; // Added typeDescription
    classDescription?: string; // Added classDescription
}

export interface PartyNote {
    noteId: string;
    partyId?: string;
    noteName?: string;
    noteText?: string;
    noteDate?: string;
    userId?: string;
    createdBy?: string;
    createdByName?: string;
}

export interface PartyContent {
    contentId: string;
    partyId?: string;
    contentName?: string;
    description?: string;
    contentDate?: string;
    contentLocation?: string;
}

export interface PartyPaymentMethodSummary {
    paymentMethodId?: string;
    paymentMethodTypeEnumId?: string;
    description?: string;
    firstNameOnAccount?: string;
    lastNameOnAccount?: string;
}

export interface PartyBankAccountSummary {
    bankName?: string;
    routingNumber?: string;
    accountNumber?: string;
}

export interface PartyPaymentSummary {
    paymentMethod?: PartyPaymentMethodSummary;
    paymentMethodId?: string;
    postalAddress?: PostalAddress;
    postalAddressStateGeo?: {
        geoId?: string;
        geoName?: string;
    };
    bankAccount?: PartyBankAccountSummary;
    creditCard?: {
        cardType?: string;
        cardNumber?: string;
        expireDate?: string;
    };
    creditCardTypeEnum?: {
        description?: string;
    };
}

export interface CustomerDetailPayload {
    party?: Party;
    partyRoleList?: PartyRole[];
    pcaaList?: PartyClassification[];
    partyIdentificationList?: PartyIdentification[];
    postalAddressList?: PostalAddress[];
    emailAddressList?: EmailAddress[];
    telecomNumberList?: TelecomNumber[];
    payments?: PartyPaymentSummary[];
    partyNoteList?: PartyNote[];
    contentList?: PartyContent[];
}

export interface CustomerDetailResponse {
    customerDetail?: CustomerDetailPayload;
}

export interface SupplierProductSummary {
    id?: string | number;
    productId?: string;
    supplierProductName?: string;
    lastPrice?: number;
}

export interface SupplierDetailPayload {
    party?: Party;
    partyRoleList?: PartyRole[];
    partyIdentificationList?: PartyIdentification[];
    pcaaList?: PartyClassification[];
    postalAddressList?: PostalAddress[];
    emailAddressList?: EmailAddress[];
    telecomNumberList?: TelecomNumber[];
    payments?: PartyPaymentSummary[];
    partyNoteList?: PartyNote[];
    contentList?: PartyContent[];
    supplierProducts?: SupplierProductSummary[];
    supplierProductsTotal?: number;
    supplierProductsPageIndex?: number;
    supplierProductsPageSize?: number;
}

export interface SupplierDetailResponse {
    supplierDetail?: SupplierDetailPayload;
}

export interface PartyListItem extends Party {
    name?: string;
}

export interface PagedPartyResponse<TItem> {
    resultList?: TItem[];
    totalCount?: number;
    totalPages?: number;
    currentPage?: number;
    pageSize?: number;
    documentListCount?: number;
}

/** Generic party write payload — used for create/update where fields vary by endpoint */
export type PartyWritePayload = { partyId?: string } & Record<string, unknown>;

export interface PartyContactMechPayload {
    partyId: string;
    contactMechId?: string;
    [key: string]: unknown;
}

export interface PartyNotePayload {
    partyId: string;
    noteId?: string;
    noteText?: string;
    noteDate?: string;
}

export interface PartyRolePayload {
    partyId?: string;
    roleTypeId?: string;
    roleType?: string;
}

export interface PartyClassificationPayload {
    partyId?: string;
    partyClassificationGroupId?: string;
    classificationTypeEnumId?: string;
}

export interface PartyIdentificationPayload {
    partyId?: string;
    partyIdentificationTypeId?: string;
    idValue?: string;
}

export interface RoleLookupItem {
    roleTypeId: string;
    description?: string;
}

export interface PaymentMethodTypeItem {
    paymentMethodTypeId?: string;
    description?: string;
}

export interface EnumerationItem {
    enumId?: string;
    description?: string;
    sequenceNum?: number | string;
}
