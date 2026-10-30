import React, { useEffect, useState } from 'react';
import { ModalBody, Button, InlineLoading, CopyButton, Stack, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { openmrsFetch } from '@openmrs/esm-framework';

interface AdhocTeleconsultationModalProps {
  patientUuid: string;
  closeModal: () => void;
}

const AdhocTeleconsultationModal: React.FC<AdhocTeleconsultationModalProps> = ({ patientUuid, closeModal }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const response = await openmrsFetch(
          `/ws/rest/v1/adhocTeleconsultation/generateAdhocTeleconsultationLink?patientUuid=${patientUuid}&provider=admin`
        );
        setLink(response.data.link);
      } catch (err) {
        setError(err.message || 'Error generating link');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLink();
  }, [patientUuid]);

  return (
    <>
      <ModalHeader
        closeModal={closeModal}
        title={t('adhocTeleconsultation', 'Ad-hoc Teleconsultation')}
      />
      <ModalBody>
        {isLoading ? (
          <InlineLoading description={t('generatingLink', 'Generating link...')} />
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : (
          <Stack gap={5}>
            <p>{t('linkGeneratedSuccessfully', 'Link generated successfully:')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f4f4f4', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              <span style={{ wordBreak: 'break-all', flexGrow: 1 }}>{link}</span>
              <CopyButton onClick={() => navigator.clipboard.writeText(link || '')} iconDescription={t('copyLink', 'Copy link')} />
            </div>
          </Stack>
        )}
      </ModalBody>
    </>
  );
};

export default AdhocTeleconsultationModal;
