import React from 'react';
import { DataTableSkeleton, Tile } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { EmptyCardIllustration, ErrorState, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import PatientQueueHeader from '../patient-queue-header/patient-queue-header.component';
import { useServiceQueuesStore } from '../store/store';
import styles from './queue-screen.scss';
import { useActiveTickets } from './useActiveTickets';

const QueueScreen: React.FC = () => {
  const { t } = useTranslation();
  const { visitQueueNumberAttributeUuid } = useConfig<ConfigObject>();
  const { selectedQueueLocationUuid, selectedServiceUuid } = useServiceQueuesStore();
  const { queueLine, isLoading, error } = useActiveTickets(visitQueueNumberAttributeUuid, {
    locationUuid: selectedQueueLocationUuid,
    serviceUuid: selectedServiceUuid,
  });

  if (isLoading) {
    return <DataTableSkeleton rowCount={5} className={styles.queueScreen} data-testid="queue-screen-skeleton" />;
  }

  return (
    <div>
      <PatientQueueHeader title={t('queueScreen', 'Queue screen')} showFilters />
      {error ? (
        <div className={styles.errorState}>
          <ErrorState error={error} headerTitle={t('queueScreen', 'Queue screen')} />
        </div>
      ) : queueLine.length === 0 ? (
        <Tile className={styles.emptyState}>
          <EmptyCardIllustration />
          <p className={styles.emptyStateContent}>{t('noActiveTickets', 'No active tickets to display')}</p>
        </Tile>
      ) : (
        <div className={styles.gridFlow} role="list" aria-label={t('patientsInQueue', 'Patients in queue')}>
          {queueLine.map((row, index) => (
            <div className={`${styles.card} ${row.isActive ? styles.activeCard : ''}`} key={row.id} role="listitem">
              <p className={styles.queuePosition}>
                {row.isActive
                  ? t('nowServing', 'Now serving')
                  : t('queuePosition', 'Queue position {{position}}', { position: index + 1 })}
              </p>
              <p className={styles.subheader}>{t('ticketNumber', 'Ticket number')}</p>
              <p className={row.status === 'calling' ? styles.headerBlinking : styles.header}>{row.ticketNumber}</p>
              <p className={styles.patientLabel}>{t('patientName', 'Patient name')}</p>
              <p className={styles.patientName}>{row.patientName}</p>
              <p className={styles.subheader}>
                {t('room', 'Room')} &nbsp; : &nbsp; {row.room}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QueueScreen;
