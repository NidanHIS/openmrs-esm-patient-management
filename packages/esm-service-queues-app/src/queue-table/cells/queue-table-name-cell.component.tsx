import React from 'react';
import { ConfigurableLink, useConfig } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import { type ConfigObject } from '../../config-schema';
import { type QueueTableColumnFunction, type QueueTableCellComponentProps } from '../../types';
import styles from './queue-table-name-cell.scss';

export const QueueTableNameCell = ({ queueEntry }: QueueTableCellComponentProps) => {
  const config = useConfig<ConfigObject>();
  const { customPatientChartUrl } = config;

  const getPatientIdentifiers = () => {
    if (!queueEntry.patient?.identifiers?.length) return '';
    const ids: string[] = [];
    const hospitalId = queueEntry.patient.identifiers.find(
      (i) => i.identifierType?.uuid === 'c0e1d2f3-a4b5-4c6d-9e0f-1a2b3c4d5e6f',
    )?.identifier;
    if (hospitalId) {
      ids.push(hospitalId);
    }
    const openMrsId = queueEntry.patient.identifiers.find(
      (i) => i.identifierType?.uuid === '05a29f94-c0ed-11e2-94be-8c13b969e334',
    )?.identifier;
    if (openMrsId) {
      ids.push(openMrsId);
    }
    if (ids.length === 0) {
      if (config?.defaultIdentifierTypes?.length) {
        for (const idTypeUuid of config.defaultIdentifierTypes) {
          const match = queueEntry.patient.identifiers.find((i) => i.identifierType?.uuid === idTypeUuid);
          if (match?.identifier) {
            ids.push(match.identifier);
            break;
          }
        }
      }
      if (ids.length === 0) {
        const preferred = queueEntry.patient.identifiers.find((i) => i.preferred)?.identifier;
        if (preferred) {
          ids.push(preferred);
        } else {
          const fallback = queueEntry.patient.identifiers[0].identifier;
          if (fallback) ids.push(fallback);
        }
      }
    }
    return ids.join(' / ');
  };

  const identifier = getPatientIdentifiers();
  const gender = queueEntry.patient.person.gender || '';
  const birthdate = queueEntry.patient.person.birthdate;
  let formattedGenderAge = gender;
  if (birthdate) {
    const age = dayjs().diff(dayjs(birthdate), 'years');
    formattedGenderAge = gender ? `${gender}/${age}Y` : `${age}Y`;
  }

  return (
    <div className={styles.patientCell}>
      <ConfigurableLink
        to={customPatientChartUrl}
        templateParams={{ patientUuid: queueEntry.patient.uuid }}
        className={styles.patientName}>
        {queueEntry.patient.person.display}
      </ConfigurableLink>
      <div className={styles.patientMeta}>
        {identifier && <span className={styles.patientId}>{identifier}</span>}
        {identifier && formattedGenderAge && <span className={styles.separator}>•</span>}
        {formattedGenderAge && <span className={styles.genderAge}>{formattedGenderAge}</span>}
      </div>
    </div>
  );
};

export const queueTableNameColumn: QueueTableColumnFunction = (key, header) => ({
  key,
  header,
  CellComponent: QueueTableNameCell,
  getFilterableValue: (queueEntry) => {
    const name = queueEntry.patient?.person?.display || '';
    const identifiers =
      queueEntry.patient?.identifiers
        ?.map((i) => i.identifier)
        .filter(Boolean)
        .join(' ') || '';
    return `${name} ${identifiers}`;
  },
});
