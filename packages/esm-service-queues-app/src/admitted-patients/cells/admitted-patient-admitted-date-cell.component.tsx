import React from 'react';
import dayjs from 'dayjs';
import { type InpatientAdmissionResult } from '../admitted-patients.resource';

interface AdmittedPatientAdmittedDateCellProps {
  admission: InpatientAdmissionResult;
}

const AdmittedPatientAdmittedDateCell: React.FC<AdmittedPatientAdmittedDateCellProps> = ({ admission }) => {
  const encounterDatetime = admission?.firstAdmissionOrTransferEncounter?.encounterDatetime;

  if (!encounterDatetime) {
    return <span>—</span>;
  }

  const formatted = dayjs(encounterDatetime).format('DD-MMM-YYYY HH:mm');
  return <span>{formatted}</span>;
};

export default AdmittedPatientAdmittedDateCell;
