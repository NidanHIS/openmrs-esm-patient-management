import React from 'react';
import { useTranslation } from 'react-i18next';
import { Time } from '@carbon/react/icons';
import { MetricsCard } from './metrics-card.component';
import { useAverageWaitTime } from '../metrics.resource';
import { useServiceQueuesStore } from '../../store/store';

export default function AverageWaitTimeExtension() {
  const { t } = useTranslation();
  const { selectedServiceUuid } = useServiceQueuesStore();
  const { waitTime } = useAverageWaitTime(selectedServiceUuid, '');

  const displayValue = waitTime ? `${waitTime.averageWaitTime} min` : '--';

  return (
    <MetricsCard
      icon={<Time size={20} />}
      value={displayValue}
      label={t('avgWait', 'Avg Wait')}
    />
  );
}
