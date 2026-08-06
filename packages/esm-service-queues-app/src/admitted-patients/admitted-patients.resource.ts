import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface AdmittedPatientPerson {
  uuid: string;
  display: string;
  gender: string;
  age: number;
  birthdate: string;
  birthtime: string | null;
  preferredName: { display: string };
  preferredAddress: { display: string } | null;
  dead: boolean;
  deathDate: string | null;
}

export interface AdmittedPatientIdentifier {
  uuid: string;
  display: string;
  identifier: string;
  identifierType: { uuid: string; display: string };
}

export interface AdmittedPatient {
  uuid: string;
  identifiers: AdmittedPatientIdentifier[];
  voided: boolean;
  person: AdmittedPatientPerson;
}

export interface AdmittedPatientVisit {
  uuid: string;
  display?: string;
}

export interface AdmittedPatientLocation {
  uuid: string;
  display: string;
}

export interface AdmittedPatientEncounter {
  encounterDatetime: string;
}

export interface InpatientAdmissionResult {
  patient: AdmittedPatient;
  visit: AdmittedPatientVisit;
  encounterAssigningToCurrentInpatientLocation: AdmittedPatientEncounter | null;
  firstAdmissionOrTransferEncounter: AdmittedPatientEncounter | null;
  currentInpatientRequest: unknown | null;
  currentInpatientLocation: AdmittedPatientLocation | null;
}

interface AdmittedPatientsFetchResponse {
  results: InpatientAdmissionResult[];
}

// prettier-ignore
const customRepresentation =
  'custom:(visit,' +
  'patient:(uuid,identifiers:(uuid,display,identifier,identifierType),voided,' +
  'person:(uuid,display,gender,age,birthdate,birthtime,preferredName,preferredAddress,dead,deathDate)),' +
  'encounterAssigningToCurrentInpatientLocation:(encounterDatetime),' +
  'currentInpatientRequest:(dispositionLocation,dispositionType,disposition:(uuid,display),dispositionEncounter:(uuid,display),dispositionObsGroup:(uuid,display),visit:(uuid),patient:(uuid)),' +
  'firstAdmissionOrTransferEncounter:(encounterDatetime),' +
  'currentInpatientLocation,' +
  ')';

/**
 * Fetches admitted patients from the emrapi inpatient admission endpoint.
 * Optionally filters by currentInpatientLocation when a locationUuid is provided.
 */
export function useAdmittedPatients(locationUuid?: string) {
  const url = locationUuid
    ? `${restBaseUrl}/emrapi/inpatient/admission?currentInpatientLocation=${locationUuid}&v=${customRepresentation}`
    : `${restBaseUrl}/emrapi/inpatient/admission?v=${customRepresentation}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: AdmittedPatientsFetchResponse }, Error>(
    url,
    openmrsFetch,
  );

  return {
    admittedPatients: data?.data?.results ?? [],
    isLoading,
    error,
    isValidating,
    mutate,
  };
}
