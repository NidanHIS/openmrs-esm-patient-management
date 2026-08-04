import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserMultiple } from '@carbon/react/icons';
import { MetricsCard } from './metrics-card.component';
import { useActiveVisits } from '../metrics.resource';

export default function CheckedInPatientsExtension() {
  const { t } = useTranslation();
  const { isLoading, activeVisitsCount } = useActiveVisits();

  return (
    <MetricsCard
      icon={<UserMultiple size={20} />}
      value={isLoading ? '--' : activeVisitsCount}
      label={t('checkedIn', 'Checked In')}
    />
  );
}
