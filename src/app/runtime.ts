/** @brief Use the browser calculator unless a build explicitly enables the connected workspace. */
export const standalone = import.meta.env.VITE_STANDALONE !== 'false';
