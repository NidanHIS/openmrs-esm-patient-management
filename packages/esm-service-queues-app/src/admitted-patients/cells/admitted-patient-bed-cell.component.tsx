import React from 'react';
import { InlineLoading } from '@carbon/react';
import { type InpatientAdmissionResult } from '../admitted-patients.resource';
import { usePatientBed } from '../admitted-patients-beds.resource';

interface AdmittedPatientBedCellProps {
  admission: InpatientAdmissionResult;
}

const AdmittedPatientBedCell: React.FC<AdmittedPatientBedCellProps> = ({ admission }) => {
  const patientUuid = admission?.patient?.uuid;
  const { bedNumber, isLoading } = usePatientBed(patientUuid);

  if (isLoading) {
    return <InlineLoading description="" />;
  }

  return <span>{bedNumber ?? '—'}</span>;
};

export default AdmittedPatientBedCell;
