// Single source of truth for job ↔ student eligibility. Used both to build the
// student feed / officer preview and to re-validate server-side at apply time
// (feed visibility is a convenience, NOT the security boundary).

export interface EligibilityStudent {
  verificationStatus: string;
  isPlaced: boolean;
  school: string;
  programme: string;
  graduationYear: number;
  cgpa: number | null;
  tenthPercentage: number | null;
  twelfthPercentage: number | null;
  ugPercentage: number | null;
  gender: string | null;
  activeBacklogs: number;
  totalBacklogs: number;
  hasResume: boolean;
  // Withdrew from a placement and not yet re-authorized by an officer.
  placementRestricted?: boolean;
  // Training metrics in %, null = nothing recorded yet. Only consulted when the
  // job sets a training criterion.
  trainingAttendancePct?: number | null;
  trainingScorePct?: number | null;
}

export interface EligibilityJob {
  eligibleSchools: string[];
  eligibleProgrammes: string[];
  graduationYears: number[];
  minCgpa: number | null;
  minTenthPercentage: number | null;
  minTwelfthPercentage: number | null;
  minUgPercentage: number | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
  minTrainingAttendance?: number | null;
  minTrainingScore?: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

function runEligibilityChecks(
  student: EligibilityStudent,
  job: EligibilityJob,
  options: { requireVerified?: boolean; requireResume?: boolean },
): EligibilityResult {
  const reasons: string[] = [];

  if (options.requireVerified && student.verificationStatus !== 'VERIFIED') {
    reasons.push('Profile not verified');
  }
  if (student.isPlaced) reasons.push('Already placed');
  if (student.placementRestricted) {
    reasons.push('Withdrew from a placement — ask your placement officer to re-enable applications');
  }
  // School / programme / gender comparisons are case-insensitive and tolerate whitespace.
  // Empty arrays mean "no filter" (common for quick/no-criteria jobs).
  const schools = job.eligibleSchools ?? [];
  const normalizedSchools = schools.map((c) => c.trim().toLowerCase());
  if (
    schools.length > 0 &&
    !normalizedSchools.includes(student.school?.trim().toLowerCase() ?? '')
  ) {
    reasons.push('School not eligible');
  }
  const programmes = job.eligibleProgrammes ?? [];
  const normalizedProgrammes = programmes.map((p) => p.trim().toLowerCase());
  if (
    programmes.length > 0 &&
    !normalizedProgrammes.includes(student.programme?.trim().toLowerCase() ?? '')
  ) {
    reasons.push('Programme not eligible');
  }
  if (job.graduationYears.length > 0 && !job.graduationYears.includes(student.graduationYear)) {
    reasons.push('Graduation year not eligible');
  }
  if (job.minCgpa != null && (student.cgpa == null || student.cgpa < job.minCgpa)) {
    reasons.push(`Percentage below ${job.minCgpa}%`);
  }
  if (
    job.minTenthPercentage != null &&
    (student.tenthPercentage == null || student.tenthPercentage < job.minTenthPercentage)
  ) {
    reasons.push(`10th below ${job.minTenthPercentage}%`);
  }
  if (
    job.minTwelfthPercentage != null &&
    (student.twelfthPercentage == null || student.twelfthPercentage < job.minTwelfthPercentage)
  ) {
    reasons.push(`12th below ${job.minTwelfthPercentage}%`);
  }
  if (
    job.minUgPercentage != null &&
    (student.ugPercentage == null || student.ugPercentage < job.minUgPercentage)
  ) {
    reasons.push(`UG below ${job.minUgPercentage}%`);
  }
  const genders = job.eligibleGenders ?? [];
  const normalizedGenders = genders.map((g) => g.trim().toUpperCase());
  if (
    genders.length > 0 &&
    (!student.gender || !normalizedGenders.includes(student.gender.trim().toUpperCase()))
  ) {
    reasons.push(student.gender ? 'Gender not eligible' : 'Gender not set');
  }
  if (job.maxActiveBacklogs != null && student.activeBacklogs > job.maxActiveBacklogs) {
    reasons.push('Too many active backlogs');
  }
  if (job.maxTotalBacklogs != null && student.totalBacklogs > job.maxTotalBacklogs) {
    reasons.push('Too many total backlogs');
  }
  if (job.minTrainingAttendance != null) {
    const pct = student.trainingAttendancePct;
    if (pct == null) reasons.push('No training attendance recorded');
    else if (pct < job.minTrainingAttendance) {
      reasons.push(`Training attendance below ${job.minTrainingAttendance}%`);
    }
  }
  if (job.minTrainingScore != null) {
    const pct = student.trainingScorePct;
    if (pct == null) reasons.push('No training scores recorded');
    else if (pct < job.minTrainingScore) {
      reasons.push(`Training score below ${job.minTrainingScore}%`);
    }
  }
  if (options.requireResume && !student.hasResume) {
    reasons.push('Resume not uploaded');
  }

  return { eligible: reasons.length === 0, reasons };
}

/** Strict eligibility check used for officer previews / verification workflows. */
export function checkEligibility(
  student: EligibilityStudent,
  job: EligibilityJob,
): EligibilityResult {
  return runEligibilityChecks(student, job, { requireVerified: true, requireResume: false });
}

/** Application-time eligibility: students can apply once their profile + resume are
 * complete enough, even if the placement officer has not verified them yet. */
export function checkApplyEligibility(
  student: EligibilityStudent,
  job: EligibilityJob,
): EligibilityResult {
  return runEligibilityChecks(student, job, { requireVerified: false, requireResume: true });
}
