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
import { Injectable } from '@angular/core';
import { ApiService } from '../../common/api.service';
import { base64ToBlob } from '../../common/blob.util';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CustomerDetailResponse,
  EnumerationItem,
  PagedPartyResponse,
  PartyClassificationPayload,
  PartyContactMechPayload,
  PartyIdentificationPayload,
  PartyListItem,
  PartyNotePayload,
  PartyRolePayload,
  PartyRole,
  PartyWritePayload,
  PaymentMethodTypeItem,
  PostalAddress,
  SupplierDetailResponse,
  TelecomNumber,
} from '@ofbiz/models/party.model';
import {
  extractPartyDetail,
  normalizeClassificationPayload,
  normalizeContactMechPayload,
  normalizeCustomerDetailResponse,
  normalizeEmailPayload,
  normalizeIdentificationPayload,
  normalizeNotePayload,
  normalizePhonePayload,
  normalizePostalAddressPayload,
  normalizeSupplierDetailResponse,
} from './party-normalization';

interface OfbizResponse<T> {
  data?: T;
}

@Injectable({
  providedIn: 'root',
})
export class PartyService {
  constructor(private apiService: ApiService) { }

  getCustomers(
    page: number,
    keyword: string,
    sortBy?: string,
    sortDirection?: string,
    statusId?: string
  ): Observable<PagedPartyResponse<PartyListItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      query: keyword,
    });
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    if (sortDirection) {
      params.append('sortDirection', sortDirection);
    }
    if (statusId) {
      params.append('statusId', statusId);
    }
    const url = `/common/customers?${params.toString()}`;
    const request$: Observable<OfbizResponse<PagedPartyResponse<PartyListItem>>> =
      this.apiService.get<OfbizResponse<PagedPartyResponse<PartyListItem>>>(url);
    return request$.pipe(
      map((response: OfbizResponse<PagedPartyResponse<PartyListItem>>) => {
        const payload = (response?.data ?? {}) as PagedPartyResponse<PartyListItem>;
        const list = Array.isArray(payload?.resultList) ? payload.resultList : [];
        const mappedList: PartyListItem[] = list.map((item) => ({
          ...item,
          name:
            [item?.firstName, item?.lastName].filter(Boolean).join(' ').trim() ||
            item?.groupName ||
            item?.partyId,
        }));
        return {
          ...payload,
          resultList: mappedList,
        };
      })
    );
  }

  getCustomersAutocompleteFromWms(keyword: string, limit: number = 20): Observable<PagedPartyResponse<PartyListItem>> {
    const params = new URLSearchParams({
      query: keyword || '',
      limit: String(limit),
    });
    const url = `/common/intra/customers/autocomplete?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => {
        const data = response?.data ?? {};
        const list = Array.isArray(data?.resultList) ? data.resultList : [];
        const mappedList: PartyListItem[] = list.map((item: any) => ({
          ...item,
          name:
            [item?.firstName, item?.lastName].filter(Boolean).join(' ').trim() ||
            item?.groupName ||
            item?.partyId,
        }));
        return {
          ...data,
          resultList: mappedList,
        };
      })
    );
  }

  getPartyRoles(roleTypeId?: string): Observable<PartyRole[]> {
    const params = new URLSearchParams();
    if (roleTypeId) {
      params.append('roleTypeId', roleTypeId);
    }
    const suffix = params.toString();
    const url = suffix ? `/party-roles?${suffix}` : '/party-roles';
    return this.apiService.getOms<PartyRole[]>(url);
  }

  getPartyRoleSummaries(roleTypeId?: string, partyIds?: string[]): Observable<PartyRole[]> {
    const params = new URLSearchParams();
    if (roleTypeId) {
      params.append('roleTypeId', roleTypeId);
    }
    if (partyIds && partyIds.length > 0) {
      params.append('partyIds', partyIds.join(','));
    }
    const suffix = params.toString();
    const url = suffix
      ? `/common/party-roles/summary?${suffix}`
      : '/common/party-roles/summary';
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data?.resultList ?? [])
    );
  }

  getPartyRolesByPartyId(partyId: string): Observable<PartyRole[]> {
    const url = `/common/party-roles/by-party/${encodeURIComponent(partyId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data?.resultList ?? [])
    );
  }

  getParties(page: number, pageSize: number, keyword: string): Observable<PagedPartyResponse<PartyListItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      roleTypeId: 'Supplier',
      pageSize: pageSize.toString(),
      anyField: keyword,
    });
    const url = `/rest/s1/commerce/parties?${params.toString()}`;
    return this.apiService.getOms<PagedPartyResponse<PartyListItem>>(url);
  }

  createCustomer(params: PartyWritePayload): Observable<unknown> {
    return this.apiService.post<OfbizResponse<{ partyId?: string }>>('/common/customers', params).pipe(
      map((response) => response?.data ?? response)
    );
  }

  getCustomer(partyId: string): Observable<CustomerDetailResponse> {
    const url = `/common/customers/${encodeURIComponent(partyId)}`;
    return this.apiService.get<OfbizResponse<CustomerDetailResponse>>(url).pipe(
      map((response) => normalizeCustomerDetailResponse(response?.data ?? {}))
    );
  }

  getSuppliers(page: number, keyword: string, sortBy?: string, sortDirection?: string, statusId?: string): Observable<PagedPartyResponse<PartyListItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      query: keyword || '',
    });
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    if (sortDirection) {
      params.append('sortDirection', sortDirection);
    }
    if (statusId) {
      params.append('statusId', statusId);
    }
    const url = `/common/suppliers?${params.toString()}`;
    return this.apiService.get<{ data?: PagedPartyResponse<PartyListItem> }>(url).pipe(
      map((response) => {
        const payload = response?.data;
        const list = Array.isArray(payload?.resultList) ? payload.resultList : [];
        const mappedList: PartyListItem[] = list.map((item) => ({
          ...item,
          name: item?.groupName || item?.name || item?.partyId,
        }));
        return {
          ...(payload ?? {}),
          resultList: mappedList,
        } as PagedPartyResponse<PartyListItem>;
      })
    );
  }

  getSuppliersAutocompleteFromWms(keyword: string, limit: number = 20): Observable<PagedPartyResponse<PartyListItem>> {
    const params = new URLSearchParams({
      query: keyword || '',
      limit: String(limit),
    });
    const url = `/common/intra/suppliers/autocomplete?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => {
        const data = response?.data ?? {};
        const list = Array.isArray(data?.resultList) ? data.resultList : [];
        const mappedList: PartyListItem[] = list.map((item: any) => ({
          ...item,
          name: item?.groupName || item?.partyId,
          type: (item as unknown as Record<string, unknown>)['roleTypeId'] || 'SUPPLIER',
          typeLabel: 'Supplier',
        }));
        return {
          ...data,
          resultList: mappedList,
        };
      })
    );
  }

  createSupplier(params: PartyWritePayload): Observable<unknown> {
    return this.apiService.post<{ data?: any }>('/common/suppliers', params).pipe(
      map((response) => response?.data ?? response)
    );
  }

  getSupplier(partyId: string): Observable<SupplierDetailResponse> {
    const url = `/common/suppliers/${encodeURIComponent(partyId)}`;
    return this.apiService.get<{ data?: SupplierDetailResponse }>(url).pipe(
      map((response) => normalizeSupplierDetailResponse(response?.data ?? {}))
    );
  }

  updateCustomer(params: PartyWritePayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId ?? '');
    const url = `/common/customers/${partyId}`;
    const body = { ...params };
    delete body.partyId;
    return this.apiService.put<OfbizResponse<{ partyId?: string }>>(url, body).pipe(
      map((response) => response?.data ?? response)
    );
  }

  updateSupplier(params: PartyWritePayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId ?? '');
    const url = `/common/suppliers/${partyId}`;
    const body = { ...params };
    delete body.partyId;
    return this.apiService.put<{ data?: any }>(url, body).pipe(
      map((response) => response?.data ?? response)
    );
  }

  addPostalAddress(partyId: string | number, payload: Partial<PostalAddress>): Observable<unknown> {
    const body = normalizePostalAddressPayload(payload);
    return this.apiService.post(`/common/parties/${encodeURIComponent(String(partyId))}/addresses`, body);
  }

  updatePostalAddress(partyId: string | number, contactMechId: string | number, payload: Partial<PostalAddress>): Observable<unknown> {
    const body = normalizePostalAddressPayload(payload);
    return this.apiService.put(
      `/common/parties/${encodeURIComponent(String(partyId))}/addresses/${encodeURIComponent(String(contactMechId))}`,
      body
    );
  }

  addAddress(params: PartyContactMechPayload): Observable<unknown> {
    const body = normalizeContactMechPayload(params, { removePartyId: true, removeContactMechId: true });
    const partyId = encodeURIComponent(params.partyId || '');
    return this.apiService.post(`/common/parties/${partyId}/addresses`, body);
  }

  updateAddress(params: PartyContactMechPayload): Observable<unknown> {
    const body = normalizeContactMechPayload(params, { removePartyId: true, removeContactMechId: true });
    const partyId = encodeURIComponent(params.partyId || '');
    const contactMechId = encodeURIComponent(params.contactMechId || '');
    return this.apiService.put(`/common/parties/${partyId}/addresses/${contactMechId}`, body);
  }

  updateEmailAddress(params: PartyContactMechPayload): Observable<unknown> {
    return this.updatePartyEmail(params);
  }

  deleteRole(params: PartyRolePayload): Observable<unknown> {
    const partyId = encodeURIComponent(params?.partyId || '');
    const roleTypeId = encodeURIComponent(params?.roleTypeId || params?.roleType || '');
    return this.apiService.delete(`/common/parties/${partyId}/roles/${roleTypeId}`);
  }

  addEmailPhone(params: PartyContactMechPayload): Observable<unknown> {
    return this.updatePartyEmail(params);
  }

  addEmail(params: PartyContactMechPayload): Observable<unknown> {
    const body = normalizeEmailPayload(params);
    if (params.contactMechId) {
      return this.updatePartyEmail(params);
    }
    const partyId = encodeURIComponent(params.partyId || '');
    return this.apiService.post(`/common/parties/${partyId}/emails`, body);
  }

  addPhone(params: PartyContactMechPayload): Observable<unknown> {
    const body = normalizePhonePayload(params);
    const partyId = encodeURIComponent(params.partyId || '');
    return this.apiService.post(`/common/parties/${partyId}/phones`, body);
  }

  updatePhoneNumber(params: PartyContactMechPayload): Observable<unknown> {
    const body = normalizePhonePayload(params);
    const partyId = encodeURIComponent(params.partyId || '');
    const contactMechId = encodeURIComponent(params.contactMechId || '');
    return this.apiService.put(`/common/parties/${partyId}/phones/${contactMechId}`, body);
  }

  deleteContactMech(params: PartyContactMechPayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId || '');
    const contactMechId = encodeURIComponent(params.contactMechId || '');
    return this.apiService.delete(`/common/parties/${partyId}/contacts/${contactMechId}`);
  }

  deleteEmail(params: PartyContactMechPayload): Observable<unknown> {
    return this.deleteContactMech(params);
  }

  deletePostalAddress(params: PartyContactMechPayload): Observable<unknown> {
    return this.deleteContactMech(params);
  }

  getPostalAddressByContactMechId(contactMechId: string): Observable<PostalAddress> {
    const url = `/postal-addresses/by-contact-mech/${encodeURIComponent(contactMechId)}`;
    return this.apiService.getOms<PostalAddress>(url);
  }

  addRole(params: PartyRolePayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId || '');
    return this.apiService.post(`/common/parties/${partyId}/roles`, {
      roleTypeId: params.roleTypeId || params.roleType,
    });
  }

  getClassifications(params: PartyClassificationPayload): Observable<unknown[]> {
    const query = new URLSearchParams();
    if (params?.classificationTypeEnumId) {
      query.append('parentTypeId', params.classificationTypeEnumId);
    }
    const suffix = query.toString();
    const url = suffix ? `/services/restGetPartyClassificationGroups?${suffix}` : '/services/restGetPartyClassificationGroups';
    return this.apiService.get<OfbizResponse<{ resultList?: unknown[] }>>(url).pipe(
      map((response) => {
        const payload = (response?.data ?? response) as { resultList?: unknown[] };
        return Array.isArray(payload?.resultList) ? payload.resultList : [];
      })
    );
  }

  deleteClassification(params: PartyClassificationPayload): Observable<unknown> {
    return this.apiService.post('/services/restDeletePartyClassification', normalizeClassificationPayload(params));
  }

  addClassification(params: PartyClassificationPayload): Observable<unknown> {
    return this.apiService.post('/services/restCreatePartyClassification', normalizeClassificationPayload(params));
  }

  addIdentification(params: PartyIdentificationPayload): Observable<unknown> {
    return this.apiService.post('/services/restCreatePartyIdentification', normalizeIdentificationPayload(params));
  }

  deleteIdentification(params: PartyIdentificationPayload): Observable<unknown> {
    return this.apiService.post('/services/restDeletePartyIdentification', normalizeIdentificationPayload(params));
  }

  getPaymentGatewayConfig(): Observable<unknown> {
    const url = `/rest/s1/commerce/paymentGatewayConfigList`;
    return this.apiService.getOms(url);
  }

  getPartyPaymentMethods(partyId: string): Observable<unknown> {
    const url = `/common/parties/${encodeURIComponent(partyId)}/payment-methods`;
    return this.apiService.get(url);
  }

  createCreditCard(partyId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/parties/${encodeURIComponent(partyId)}/payment-methods/credit-cards`;
    return this.apiService.post(url, payload);
  }

  updateCreditCard(partyId: string, paymentMethodId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/parties/${encodeURIComponent(partyId)}/payment-methods/credit-cards/${encodeURIComponent(paymentMethodId)}`;
    return this.apiService.put(url, payload);
  }

  createBankAccount(partyId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/parties/${encodeURIComponent(partyId)}/payment-methods/bank-accounts`;
    return this.apiService.post(url, payload);
  }

  updateBankAccount(partyId: string, paymentMethodId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/parties/${encodeURIComponent(partyId)}/payment-methods/bank-accounts/${encodeURIComponent(paymentMethodId)}`;
    return this.apiService.put(url, payload);
  }

  deletePaymentMethod(partyId: string, paymentMethodId: string): Observable<unknown> {
    const url = `/common/parties/${encodeURIComponent(partyId)}/payment-methods/${encodeURIComponent(paymentMethodId)}`;
    return this.apiService.delete(url);
  }

  createPartyNote(params: PartyNotePayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId || '');
    return this.apiService.post(`/common/parties/${partyId}/notes`, normalizeNotePayload(params));
  }

  updatePartyNote(params: PartyNotePayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId || '');
    const noteId = encodeURIComponent(params.noteId || '');
    return this.apiService.put(`/common/parties/${partyId}/notes/${noteId}`, normalizeNotePayload(params));
  }

  deletePartyNote(params: PartyNotePayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId || '');
    const noteId = encodeURIComponent(params.noteId || '');
    return this.apiService.delete(`/common/parties/${partyId}/notes/${noteId}`);
  }

  createPartyContent(params: FormData): Observable<unknown> {
    const partyId = params.get('partyId') as string;
    const url = `/common/parties/${encodeURIComponent(partyId)}/contents`;
    return this.apiService.postFormData(url, params);
  }

  downloadPartyContent(partyId: string, contentId: string): Observable<Blob> {
    const url = `/common/parties/${encodeURIComponent(partyId)}/contents/${encodeURIComponent(contentId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => base64ToBlob(
        response?.data?.fileBytes,
        response?.data?.mimeType || 'application/octet-stream'
      ))
    );
  }

  getPartyPostalContactMechByPurpose(
    partyId: string,
    contactMechPurposeId?: string,
    partyType: 'customer' | 'supplier' = 'customer'
  ): Observable<PostalAddress[]> {
    const basePath = partyType === 'supplier' ? '/common/suppliers' : '/common/customers';
    const url = `${basePath}/${encodeURIComponent(partyId)}`;
    return this.apiService.get<OfbizResponse<any>>(url).pipe(
      map((response: any) => {
        const detail = extractPartyDetail(response, partyType);
        const list: PostalAddress[] = Array.isArray(detail?.['postalAddressList']) ? detail['postalAddressList'] as PostalAddress[] : [];
        if (!contactMechPurposeId) {
          return list;
        }
        return list.filter(
          (address) => (address?.contactMechPurposeId || (address as PostalAddress & { contactMechPurposeTypeId?: string })?.contactMechPurposeTypeId) === contactMechPurposeId
        );
      })
    );
  }

  getPartyTelecomContactMechByPurpose(
    partyId: string,
    contactMechPurposeId: string,
    partyType: 'customer' | 'supplier' = 'customer'
  ): Observable<TelecomNumber[]> {
    const basePath = partyType === 'supplier' ? '/common/suppliers' : '/common/customers';
    const url = `${basePath}/${encodeURIComponent(partyId)}`;
    return this.apiService.get<OfbizResponse<any>>(url).pipe(
      map((response: any) => {
        const detail = extractPartyDetail(response, partyType);
        const list: TelecomNumber[] = Array.isArray(detail?.['telecomNumberList']) ? detail['telecomNumberList'] as TelecomNumber[] : [];
        if (!contactMechPurposeId) {
          return list;
        }
        return list.filter(
          (telecom) => (telecom?.contactMechPurposeId || (telecom as TelecomNumber & { contactMechPurposeTypeId?: string })?.contactMechPurposeTypeId) === contactMechPurposeId
        );
      })
    );
  }

  getPaymentMethodTypes(): Observable<PaymentMethodTypeItem[]> {
    return this.apiService.getOms<PaymentMethodTypeItem[]>('/accounting/payment-method-types');
  }

  getEnumerations(enumTypeId: string): Observable<EnumerationItem[]> {
    return this.apiService.getLookup<EnumerationItem>('enumerations', enumTypeId);
  }

  private updatePartyEmail(params: PartyContactMechPayload): Observable<unknown> {
    const partyId = encodeURIComponent(params.partyId || '');
    const contactMechId = encodeURIComponent(params.contactMechId || '');
    return this.apiService.put(
      `/common/parties/${partyId}/emails/${contactMechId}`,
      normalizeEmailPayload(params)
    );
  }
}
