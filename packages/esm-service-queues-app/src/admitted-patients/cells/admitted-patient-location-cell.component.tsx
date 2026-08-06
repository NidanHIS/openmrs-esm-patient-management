import React from 'react';
import { type InpatientAdmissionResult } from '../admitted-patients.resource';

interface AdmittedPatientLocationCellProps {
  admission: InpatientAdmissionResult;
}

const AdmittedPatientLocationCell: React.FC<AdmittedPatientLocationCellProps> = ({ admission }) => {
  const location = admission?.currentInpatientLocation?.display;
  return <span>{location ?? '—'}</span>;
};

export default AdmittedPatientLocationCell;
