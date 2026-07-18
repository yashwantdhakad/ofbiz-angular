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
import {
  CustomerDetailResponse,
  PartyClassificationPayload,
  PartyContactMechPayload,
  PartyIdentificationPayload,
  PartyNotePayload,
  PostalAddress,
  SupplierDetailResponse,
} from '@ofbiz/models/party.model';

interface OfbizResponse<T> {
  data?: T;
}

export function extractPartyDetail(
  response: unknown,
  partyType: 'customer' | 'supplier'
): Record<string, unknown> {
  const payload = response as OfbizResponse<Record<string, unknown>> | Record<string, unknown>;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as OfbizResponse<Record<string, unknown>>).data;
    if (data && typeof data === 'object') {
      return partyType === 'supplier'
        ? (data['supplierDetail'] as Record<string, unknown> || {})
        : (data['customerDetail'] as Record<string, unknown> || {});
    }
  }
  const raw = payload as Record<string, unknown>;
  return partyType === 'supplier'
    ? (raw?.['supplierDetail'] as Record<string, unknown> || {})
    : (raw?.['customerDetail'] as Record<string, unknown> || {});
}

export function normalizeCustomerDetailResponse(response: CustomerDetailResponse | Record<string, unknown>): CustomerDetailResponse {
  const data = response && typeof response === 'object' ? response : {};
  const detail = (data as CustomerDetailResponse).customerDetail;
  if (!detail) {
    return data as CustomerDetailResponse;
  }
  return {
    ...data,
    customerDetail: normalizePartyDetail(detail as any),
  } as CustomerDetailResponse;
}

export function normalizeSupplierDetailResponse(response: SupplierDetailResponse | Record<string, unknown>): SupplierDetailResponse {
  const data = response && typeof response === 'object' ? response : {};
  const detail = (data as SupplierDetailResponse).supplierDetail;
  if (!detail) {
    return data as SupplierDetailResponse;
  }
  return {
    ...data,
    supplierDetail: normalizePartyDetail(detail as any),
  } as SupplierDetailResponse;
}

export function normalizePartyDetail<T extends Record<string, unknown>>(detail: T): T {
  return {
    ...detail,
    postalAddressList: normalizeContactMechList(detail['postalAddressList']),
    emailAddressList: normalizeContactMechList(detail['emailAddressList']),
    telecomNumberList: normalizeContactMechList(detail['telecomNumberList']),
    partyNoteList: normalizePartyNoteList(detail['partyNoteList']),
  } as T;
}

export function normalizeContactMechList<T>(list: T): T {
  if (!Array.isArray(list)) {
    return list;
  }
  return list.map((item) => normalizeContactMechResult(item)) as T;
}

export function normalizePartyNoteList<T>(list: T): T {
  if (!Array.isArray(list)) {
    return list;
  }
  return list.map((item) => {
    if (!item || typeof item !== 'object') {
      return item;
    }
    const result = { ...(item as Record<string, unknown>) };
    if (result['noteText'] === null || result['noteText'] === undefined) {
      result['noteText'] = result['noteInfo'] ?? result['noteName'] ?? result['internalNote'] ?? '';
    }
    if ((result['noteDate'] === null || result['noteDate'] === undefined) && result['noteDateTime'] !== null && result['noteDateTime'] !== undefined) {
      result['noteDate'] = result['noteDateTime'];
    }
    if (result['userId'] === null || result['userId'] === undefined) {
      result['userId'] = result['createdBy'] ?? result['createdByUserLogin'] ?? result['noteParty'];
    }
    return result;
  }) as T;
}

export function normalizeContactMechResult<T extends Record<string, unknown>>(item: T): T {
  if (!item || typeof item !== 'object') {
    return item;
  }
  const result = { ...item } as Record<string, unknown>;
  if ((result['contactMechPurposeId'] === null || result['contactMechPurposeId'] === undefined) && result['contactMechPurposeTypeId'] !== null && result['contactMechPurposeTypeId'] !== undefined) {
    result['contactMechPurposeId'] = result['contactMechPurposeTypeId'];
  }
  if ((result['contactMechPurposeTypeId'] === null || result['contactMechPurposeTypeId'] === undefined) && result['contactMechPurposeId'] !== null && result['contactMechPurposeId'] !== undefined) {
    result['contactMechPurposeTypeId'] = result['contactMechPurposeId'];
  }
  return result as T;
}

export function normalizeContactMechPayload(
  params: PartyContactMechPayload,
  options: { removePartyId?: boolean; removeContactMechId?: boolean } = {}
): Record<string, unknown> {
  const {
    partyId,
    contactMechId,
    contactMechPurposeId,
    contactMechPurposeTypeId,
    ...body
  } = params as PartyContactMechPayload & { contactMechPurposeTypeId?: string };

  const resolvedPurposeTypeId = contactMechPurposeTypeId ?? contactMechPurposeId;
  const result: Record<string, unknown> = {
    ...body,
    ...((resolvedPurposeTypeId !== null && resolvedPurposeTypeId !== undefined) ? { contactMechPurposeTypeId: resolvedPurposeTypeId } : {}),
  };
  if (!options.removePartyId) {
    result['partyId'] = partyId;
  }
  if (!options.removeContactMechId && contactMechId !== undefined) {
    result['contactMechId'] = contactMechId;
  }
  return result;
}

export function normalizeEmailPayload(params: PartyContactMechPayload): Record<string, unknown> {
  const {
    contactMechId,
    contactMechPurposeId,
    contactMechPurposeTypeId,
    ...body
  } = params as PartyContactMechPayload & { contactMechPurposeTypeId?: string };
  const purposeTypeId = normalizeEmailPurposeTypeId(contactMechPurposeTypeId ?? contactMechPurposeId);
  return {
    ...body,
    ...(contactMechId !== undefined ? { contactMechId } : {}),
    ...(purposeTypeId !== undefined ? { contactMechPurposeTypeId: purposeTypeId } : {}),
  };
}

export function normalizePhonePayload(params: PartyContactMechPayload): Record<string, unknown> {
  const {
    contactMechId,
    contactMechPurposeId,
    contactMechPurposeTypeId,
    ...body
  } = params as PartyContactMechPayload & { contactMechPurposeTypeId?: string };
  const purposeTypeId = normalizePhonePurposeTypeId(contactMechPurposeTypeId ?? contactMechPurposeId);
  return {
    ...body,
    ...(contactMechId !== undefined ? { contactMechId } : {}),
    ...(purposeTypeId !== undefined ? { contactMechPurposeTypeId: purposeTypeId } : {}),
  };
}

export function normalizeNotePayload(params: PartyNotePayload): Record<string, unknown> {
  const { noteText, ...body } = params;
  return {
    ...body,
    ...(noteText !== undefined ? { note: noteText } : {}),
  };
}

export function normalizePostalAddressPayload(payload: Partial<PostalAddress>): Record<string, unknown> {
  const {
    contactMechPurposeId,
    contactMechPurposeTypeId,
    ...body
  } = payload as Partial<PostalAddress> & { contactMechPurposeTypeId?: string };

  const resolvedPurposeTypeId = contactMechPurposeTypeId ?? contactMechPurposeId;
  return {
    ...body,
    ...(resolvedPurposeTypeId !== undefined ? { contactMechPurposeTypeId: resolvedPurposeTypeId } : {}),
  };
}

export function normalizeEmailPurposeTypeId(value?: unknown): string | undefined {
  const purpose = typeof value === 'string' ? value : undefined;
  switch (purpose) {
    case 'SHIPPING_EMAIL':
      return 'PRIMARY_EMAIL';
    case 'PAYMENT_EMAIL':
      return 'BILLING_EMAIL';
    default:
      return purpose || undefined;
  }
}

export function normalizePhonePurposeTypeId(value?: unknown): string | undefined {
  const purpose = typeof value === 'string' ? value : undefined;
  if (purpose === 'PHONE_SHIPPING') {
    return 'PHONE_SHIP_ORIG';
  }
  return purpose || undefined;
}

export function normalizeIdentificationPayload(params: PartyIdentificationPayload & { partyIdTypeEnumId?: string }): Record<string, unknown> {
  const {
    partyIdTypeEnumId,
    partyIdentificationTypeId,
    ...body
  } = params as PartyIdentificationPayload & { partyIdTypeEnumId?: string; partyIdentificationTypeId?: string };

  const resolvedTypeId = partyIdentificationTypeId ?? partyIdTypeEnumId;
  return {
    ...body,
    ...(resolvedTypeId !== undefined ? { partyIdentificationTypeId: resolvedTypeId } : {}),
  };
}

export function normalizeClassificationPayload(params: PartyClassificationPayload & { partyClassificationId?: string }): Record<string, unknown> {
  const {
    partyClassificationId,
    partyClassificationGroupId,
    ...body
  } = params as PartyClassificationPayload & { partyClassificationId?: string; partyClassificationGroupId?: string };

  const resolvedGroupId = partyClassificationGroupId ?? partyClassificationId;
  return {
    ...body,
    ...(resolvedGroupId !== undefined ? { partyClassificationGroupId: resolvedGroupId } : {}),
  };
}
