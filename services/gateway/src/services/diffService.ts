export interface SoapDiff {
  subjectiveChanged: boolean;
  objectiveChanged: boolean;
  assessmentChanged: boolean;
  planChanged: boolean;
  changesSummary: string;
  totalWordsModified: number;
}

export class DiffService {
  /**
   * Calculates diff between original AI draft and doctor-approved final content.
   */
  public static calculateSoapDiff(
    original: { subjective?: string; objective?: string; assessment?: string; plan?: string },
    finalContent: { subjective?: string; objective?: string; assessment?: string; plan?: string }
  ): SoapDiff {
    const subjectiveChanged = (original.subjective || '').trim() !== (finalContent.subjective || '').trim();
    const objectiveChanged = (original.objective || '').trim() !== (finalContent.objective || '').trim();
    const assessmentChanged = (original.assessment || '').trim() !== (finalContent.assessment || '').trim();
    const planChanged = (original.plan || '').trim() !== (finalContent.plan || '').trim();

    const changedSections: string[] = [];
    if (subjectiveChanged) changedSections.push('Subjective');
    if (objectiveChanged) changedSections.push('Objective');
    if (assessmentChanged) changedSections.push('Assessment');
    if (planChanged) changedSections.push('Plan');

    let totalWordsModified = 0;
    const calcWords = (text?: string) => (text ? text.trim().split(/\s+/).length : 0);

    for (const key of ['subjective', 'objective', 'assessment', 'plan'] as const) {
      const origWords = calcWords(original[key]);
      const finalWords = calcWords(finalContent[key]);
      totalWordsModified += Math.abs(finalWords - origWords);
    }

    const changesSummary =
      changedSections.length > 0
        ? `Clinician modified sections: ${changedSections.join(', ')} (${totalWordsModified} word variance vs AI draft).`
        : 'Clinician approved original AI draft with no textual modifications.';

    return {
      subjectiveChanged,
      objectiveChanged,
      assessmentChanged,
      planChanged,
      changesSummary,
      totalWordsModified,
    };
  }
}
