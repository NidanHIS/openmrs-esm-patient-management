import React from 'react';
import dayjs from 'dayjs';
import { ConfigurableLink, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../config-schema';
import { type InpatientAdmissionResult } from '../admitted-patients.resource';
import styles from './admitted-patient-name-cell.scss';

interface AdmittedPatientNameCellProps {
  admission: InpatientAdmissionResult;
}

const AdmittedPatientNameCell: React.FC<AdmittedPatientNameCellProps> = ({ admission }) => {
  const config = useConfig<ConfigObject>();
  const { customPatientChartUrl, defaultIdentifierTypes } = config;
  const { patient } = admission;

  const getPatientIdentifier = () => {
    if (!patient?.identifiers?.length) return '';

    // Try default identifier types from config first
    if (defaultIdentifierTypes?.length) {
      for (const idTypeUuid of defaultIdentifierTypes) {
        const match = patient.identifiers.find((i) => i.identifierType?.uuid === idTypeUuid);
        if (match?.identifier) return match.identifier;
      }
    }

    // Fall back to preferred or first identifier
    return (
      patient.identifiers.find((i) => i.identifier)?.identifier ?? ''
    );
  };

  const identifier = getPatientIdentifier();
  const gender = patient?.person?.gender ?? '';
  const birthdate = patient?.person?.birthdate;
  let formattedGenderAge = gender;
  if (birthdate) {
    const age = dayjs().diff(dayjs(birthdate), 'years');
    formattedGenderAge = gender ? `${gender}/${age}Y` : `${age}Y`;
  }

  return (
    <div className={styles.patientCell}>
      <ConfigurableLink
        to={customPatientChartUrl}
        templateParams={{ patientUuid: patient.uuid }}
        className={styles.patientName}>
        {patient?.person?.display ?? patient?.person?.preferredName?.display ?? '—'}
      </ConfigurableLink>
      <div className={styles.patientMeta}>
        {identifier && <span className={styles.patientId}>{identifier}</span>}
        {identifier && formattedGenderAge && <span className={styles.separator}>•</span>}
        {formattedGenderAge && <span className={styles.genderAge}>{formattedGenderAge}</span>}
      </div>
    </div>
  );
};

export default AdmittedPatientNameCell;
