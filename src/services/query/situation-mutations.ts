import { useMutation } from '@tanstack/react-query';

import {
  SituationApiError,
  requestSituationNormalization,
} from '@/services/api/situation-client';

export { SituationApiError };

export function useSituationNormalizationMutation() {
  return useMutation({
    mutationKey: ['situations', 'normalize'],
    mutationFn: requestSituationNormalization,
  });
}
