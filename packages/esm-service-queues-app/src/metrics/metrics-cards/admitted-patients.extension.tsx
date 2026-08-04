import React from 'react';
import { useTranslation } from 'react-i18next';
import { Hospital } from '@carbon/react/icons';
import { MetricsCard } from './metrics-card.component';
import { useAdmittedPatients } from '../../admitted-patients/admitted-patients.resource';
import { useServiceQueuesStore } from '../../store/store';

export default function AdmittedPatientsMetricExtension() {
  const { t } = useTranslation();
  const { selectedQueueLocationUuid } = useServiceQueuesStore();
  const { admittedPatients, isLoading } = useAdmittedPatients(selectedQueueLocationUuid);

  return (
    <MetricsCard
      icon={<Hospital size={20} />}
      value={isLoading ? '--' : admittedPatients.length}
      label={t('admittedPatients', 'Admitted patients')}
    />
  );
}
