import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  Layer,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tile,
} from '@carbon/react';
import { isDesktop, useLayoutType, usePagination } from '@openmrs/esm-framework';
import { useServiceQueuesStore } from '../store/store';
import { useAdmittedPatients, type InpatientAdmissionResult } from './admitted-patients.resource';
import AdmittedPatientNameCell from './cells/admitted-patient-name-cell.component';
import AdmittedPatientAdmittedDateCell from './cells/admitted-patient-admitted-date-cell.component';
import AdmittedPatientLocationCell from './cells/admitted-patient-location-cell.component';
import AdmittedPatientBedCell from './cells/admitted-patient-bed-cell.component';
import styles from '../queue-table/queue-table.scss';

const PAGE_SIZES = [10, 20, 30, 40, 50];

// Carbon DataTable requires plain-value rows. We pass placeholder strings and
// render actual JSX by indexing back into the original sorted admissions array.
const CELL_PLACEHOLDER = '__CUSTOM__';

const AdmittedPatientsTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';

  const { selectedQueueLocationUuid } = useServiceQueuesStore();
  const { admittedPatients, isLoading, error } = useAdmittedPatients(selectedQueueLocationUuid);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const headers = [
    { key: 'name', header: t('name', 'Name') },
    { key: 'admittedDate', header: t('admittedDate', 'Admitted date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'bedNumber', header: t('bedNumber', 'Bed number') },
  ];

  // Filter by search term against plain-text values
  const filteredAdmissions = useMemo<InpatientAdmissionResult[]>(() => {
    if (!searchTerm) return admittedPatients;
    const lower = searchTerm.toLowerCase();
    return admittedPatients.filter((admission) => {
      const name = admission.patient?.person?.display ?? '';
      const location = admission.currentInpatientLocation?.display ?? '';
      const identifier = admission.patient?.identifiers?.[0]?.identifier ?? '';
      return (
        name.toLowerCase().includes(lower) ||
        location.toLowerCase().includes(lower) ||
        identifier.toLowerCase().includes(lower)
      );
    });
  }, [admittedPatients, searchTerm]);

  const { goTo, results: paginatedAdmissions, currentPage } = usePagination(filteredAdmissions, currentPageSize);

  // Carbon DataTable rows — only `id` matters for keying; cell values are
  // replaced during rendering by indexing into paginatedAdmissions.
  const tableRows = useMemo(
    () =>
      paginatedAdmissions.map((admission) => ({
        id: admission.patient?.uuid ?? Math.random().toString(),
        name: CELL_PLACEHOLDER,
        admittedDate: CELL_PLACEHOLDER,
        location: CELL_PLACEHOLDER,
        bedNumber: CELL_PLACEHOLDER,
      })),
    [paginatedAdmissions],
  );

  if (isLoading) {
    return (
      <div className={styles.skeletonContainer}>
        <DataTableSkeleton role="progressbar" columnCount={4} rowCount={10} zebra />
      </div>
    );
  }

  if (error) {
    return (
      <InlineNotification
        kind="error"
        title={t('errorLoadingAdmittedPatients', 'Error loading admitted patients')}
        subtitle={error?.message}
        lowContrast
      />
    );
  }

  return (
    <Layer>
      <DataTable rows={tableRows} headers={headers} size={responsiveSize} useZebraStyles>
        {({ rows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps }) => (
          <TableContainer className={styles.tableContainer}>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  className={styles.search}
                  onChange={(e) => {
                    const value = typeof e === 'string' ? e : (e?.target as HTMLInputElement)?.value ?? '';
                    setSearchTerm(value);
                    goTo(1);
                  }}
                  placeholder={t('searchAdmittedPatients', 'Search admitted patients')}
                  size={responsiveSize}
                  persistent
                />
              </TableToolbarContent>
            </TableToolbar>

            <Table {...getTableProps()} aria-label={t('admittedPatientsTable', 'Admitted patients table')}>
              <TableHead>
                <TableRow>
                  {dtHeaders.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, rowIndex) => {
                  const admission = paginatedAdmissions[rowIndex];
                  if (!admission) return null;
                  return (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      <TableCell>
                        <AdmittedPatientNameCell admission={admission} />
                      </TableCell>
                      <TableCell>
                        <AdmittedPatientAdmittedDateCell admission={admission} />
                      </TableCell>
                      <TableCell>
                        <AdmittedPatientLocationCell admission={admission} />
                      </TableCell>
                      <TableCell>
                        <AdmittedPatientBedCell admission={admission} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {rows.length === 0 && (
              <div className={styles.tileContainer}>
                <Tile className={styles.tile}>
                  <div className={styles.tileContent}>
                    <p className={styles.content}>
                      {searchTerm
                        ? t('noMatchingAdmittedPatients', 'No admitted patients match your search')
                        : t('noAdmittedPatients', 'No admitted patients to display')}
                    </p>
                    {searchTerm && (
                      <p className={styles.helper}>{t('tryDifferentSearch', 'Try a different search term')}</p>
                    )}
                  </div>
                </Tile>
              </div>
            )}

            {filteredAdmissions.length > currentPageSize && (
              <Pagination
                forwardText={t('nextPage', 'Next page')}
                backwardText={t('previousPage', 'Previous page')}
                page={currentPage}
                pageSize={currentPageSize}
                pageSizes={PAGE_SIZES}
                totalItems={filteredAdmissions.length}
                onChange={({ pageSize, page }) => {
                  if (pageSize !== currentPageSize) setCurrentPageSize(pageSize);
                  if (page !== currentPage) goTo(page);
                }}
              />
            )}
          </TableContainer>
        )}
      </DataTable>
    </Layer>
  );
};

export default AdmittedPatientsTable;
