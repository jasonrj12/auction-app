/** Map Firebase auth and Firestore error codes to friendly messages */
export function friendlyError(err) {
  if (!err) return 'An unexpected error occurred.';
  const code = err.code || '';
  const message = err.message || '';

  const map = {
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many unsuccessful attempts. Please try again later.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'permission-denied': 'You do not have permission to perform this action.',
    'unavailable': 'Service temporarily unavailable. Please try again in a moment.',
  };

  if (map[code]) return map[code];

  if (message.includes('permission-denied')) {
    return 'Permission denied by security rules.';
  }

  return message || 'Something went wrong. Please try again.';
}
