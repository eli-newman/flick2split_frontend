import { createContext, useCallback, useContext, useState } from 'react';
import { useAuth } from '../config/AuthContext';
import SignUpSheet from './SignUpSheet';

const SignUpSheetContext = createContext(null);

const INITIAL = {
  visible: false,
  surface: null,
  title: null,
  subtitle: null,
  onSuccess: null,
};

export function SignUpSheetProvider({ children }) {
  const [state, setState] = useState(INITIAL);

  const open = useCallback((opts) => {
    setState({
      visible: true,
      surface: opts?.surface || 'unknown',
      title: opts?.title || 'Save your splits',
      subtitle: opts?.subtitle || 'Sign up to keep your history and share with friends.',
      onSuccess: opts?.onSuccess || null,
    });
  }, []);

  const close = useCallback(({ success } = {}) => {
    setState((prev) => {
      if (success && prev.onSuccess) {
        // Defer the success callback so the sheet has time to dismiss before the
        // next surface (Venmo deep link, native share sheet) takes the foreground.
        setTimeout(() => prev.onSuccess(), 200);
      }
      return INITIAL;
    });
  }, []);

  return (
    <SignUpSheetContext.Provider value={{ open }}>
      {children}
      <SignUpSheet
        visible={state.visible}
        surface={state.surface}
        title={state.title}
        subtitle={state.subtitle}
        onClose={close}
      />
    </SignUpSheetContext.Provider>
  );
}

export function useSignUpSheet() {
  const ctx = useContext(SignUpSheetContext);
  if (!ctx) throw new Error('useSignUpSheet must be used inside SignUpSheetProvider');
  return ctx;
}

/**
 * Wraps an action with an auth gate. For anonymous users, opens the SignUpSheet
 * and runs the action on successful upgrade. For signed-up users, runs the
 * action immediately.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   const onVenmoTap = () => requireAuth(() => openVenmo(amount, name), {
 *     surface: 'post_split_venmo',
 *     title: 'Save this split',
 *     subtitle: 'Sign up to keep your history and pay with Venmo.',
 *   });
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const { open } = useSignUpSheet();

  return useCallback(
    (action, opts) => {
      if (user && !user.isAnonymous) {
        action?.();
        return;
      }
      open({ ...opts, onSuccess: action });
    },
    [user, open]
  );
}
