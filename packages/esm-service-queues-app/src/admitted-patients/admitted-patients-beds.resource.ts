import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface BedResult {
  bedId: number;
  bedNumber: string;
  bedType: { uuid: string; name: string; displayName: string } | null;
  physicalLocation: { uuid: string; display: string } | null;
}

/**
 * Fetches the bed currently assigned to a patient using
 * GET /rest/v1/beds?patientUuid={patientUuid}
 *
 * Returns the first result's bedNumber, or undefined if no bed is assigned.
 */
export function usePatientBed(patientUuid: string | undefined) {
  const url = patientUuid ? `${restBaseUrl}/beds?patientUuid=${patientUuid}` : null;

  const { data, error, isLoading } = useSWR<{ data: { results: BedResult[] } }, Error>(url, openmrsFetch);

  const bedNumber = data?.data?.results?.[0]?.bedNumber ?? undefined;

  return { bedNumber, isLoading, error };
}
