import React, { useEffect, useMemo, useState } from 'react';
import { DataTableSkeleton, Dropdown, Layer, TableToolbarSearch } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { isDesktop, showSnackbar, useLayoutType, useSession } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import { updateSelectedQueueStatus, useServiceQueuesStore } from '../store/store';
import { useColumns } from './cells/columns.resource';
import { useQueueEntries } from '../hooks/useQueueEntries';
import useQueueStatuses from '../hooks/useQueueStatuses';
import AddPatientToQueueButton from './components/add-patient-to-queue-button.component';
import ClearQueueEntries from '../modals/clear-queue-entries-modal/clear-queue-entries.component';
import QueueTable from './queue-table.component';
import QueueTableExpandedRow from './queue-table-expanded-row.component';
import styles from './queue-table.scss';

dayjs.extend(isToday);

interface DefaultQueueTableProps {
  filterType?: 'active' | 'today' | 'my-patients';
}

function DefaultQueueTable({ filterType = 'active' }: DefaultQueueTableProps) {
  return (
    <div className={styles.defaultQueueTable}>
      <Layer className={styles.tableSection}>
        <QueueTableSection filterType={filterType} />
      </Layer>
    </div>
  );
}

function QueueTableSection({ filterType }: { filterType: 'active' | 'today' | 'my-patients' }) {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { selectedServiceUuid, selectedQueueLocationUuid, selectedQueueStatusUuid } = useServiceQueuesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const session = useSession();
  const currentProviderUuid = session?.currentProvider?.uuid;

  const searchCriteria = useMemo(() => {
    return {
      service: selectedServiceUuid,
      location: selectedQueueLocationUuid,
      isEnded: false,
      status: selectedQueueStatusUuid,
      ...(filterType === 'my-patients' && {
        providerWaitingFor: currentProviderUuid || '00000000-0000-0000-0000-000000000000',
      }),
    };
  }, [selectedServiceUuid, selectedQueueLocationUuid, selectedQueueStatusUuid, filterType, currentProviderUuid]);

  const { queueEntries, isLoading, error, isValidating } = useQueueEntries(searchCriteria);

  useEffect(() => {
    if (error?.message) {
      showSnackbar({
        title: t('errorLoadingQueueEntries', 'Error loading queue entries'),
        kind: 'error',
        subtitle: error?.message,
      });
    }
  }, [error?.message, t]);

  const columns = useColumns(null, null);
  useEffect(() => {
    if (!columns) {
      showSnackbar({
        kind: 'warning',
        title: t('notableConfig', 'No table configuration'),
        subtitle: 'No table configuration defined for queue: null and status: null',
      });
    }
  }, [columns, t]);

  const filteredQueueEntries = useMemo(() => {
    let result = queueEntries ?? [];

    if (filterType === 'today') {
      result = result.filter((entry) => entry.startedAt && dayjs(entry.startedAt).isToday());
    }

    const searchTermLowercase = searchTerm.toLowerCase();
    return result.filter((queueEntry) => {
      return columns?.some((column) => {
        const columnSearchTerm = column.getFilterableValue?.(queueEntry)?.toLocaleLowerCase();
        return columnSearchTerm?.includes(searchTermLowercase);
      });
    });
  }, [columns, queueEntries, searchTerm, filterType]);

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  return (
    <QueueTable
      ExpandedRow={QueueTableExpandedRow}
      isValidating={isValidating}
      queueEntries={filteredQueueEntries ?? []}
      queueUuid={null}
      statusUuid={null}
      tableFilters={
        <div className={styles.tableFilters}>
          <TableToolbarSearch
            className={styles.search}
            onChange={(e) => {
              if (typeof e === 'string') {
                setSearchTerm(e);
              } else if (e && 'target' in e) {
                const target = e.target as HTMLInputElement;
                setSearchTerm(target.value);
              }
            }}
            placeholder={t('searchThisList', 'Search this list')}
            size={isDesktop(layout) ? 'sm' : 'lg'}
            persistent
          />
          <div className={styles.filterActionsGroup}>
            <StatusDropdownFilter />
            {filteredQueueEntries?.length > 0 && <ClearQueueEntries queueEntries={filteredQueueEntries} />}
            <div className={styles.addPatientButton}>
              <AddPatientToQueueButton />
            </div>
          </div>
        </div>
      }
    />
  );
}

function StatusDropdownFilter() {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { statuses } = useQueueStatuses();
  const { selectedQueueStatusDisplay } = useServiceQueuesStore();
  const handleStatusChange = ({ selectedItem }) => {
    updateSelectedQueueStatus(selectedItem.uuid, selectedItem?.display);
  };

  return (
    <div className={styles.filterContainer}>
      <Dropdown
        id="statusFilter"
        items={[{ display: `${t('any', 'Any')}` }, ...(statuses ?? [])]}
        itemToString={(item) => (item ? item.display : '')}
        label={selectedQueueStatusDisplay ?? t('all', 'All')}
        onChange={handleStatusChange}
        size={isDesktop(layout) ? 'sm' : 'lg'}
        titleText={t('showPatientsWithStatus', 'Status:')}
        type="inline"
      />
    </div>
  );
}

export default DefaultQueueTable;
