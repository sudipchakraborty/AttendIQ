/** @brief Use the browser calculator unless a build explicitly enables the connected workspace. */
export const leaveReview = import.meta.env.VITE_LEAVE_REVIEW === 'true';
export const standalone = !leaveReview && import.meta.env.VITE_STANDALONE !== 'false';
export const localCalculations = standalone || leaveReview;
