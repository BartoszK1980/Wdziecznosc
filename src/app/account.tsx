import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { wipeLocalEntries } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';
import {
  confirmEmailLink,
  confirmSignIn,
  getAccountState,
  requestEmailLink,
  requestSignIn,
  signOut,
  type AccountState,
} from '@/sync/supabase';
import { resetPullWatermark, syncNow } from '@/sync/sync';

/** 'link' = podpiecie e-maila do tej sesji. 'restore' = wejscie na istniejace konto. */
type Mode = 'link' | 'restore';
type Step = 'email' | 'code';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AccountScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();

  const [account, setAccount] = useState<AccountState | null>(null);
  const [mode, setMode] = useState<Mode>('link');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getAccountState().then(setAccount);
  }, []);

  const fail = (message: string) => Alert.alert(t('account.title'), message);

  const sendCode = async () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      fail(t('account.invalidEmail'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'link') {
        await requestEmailLink(email.trim());
      } else {
        await requestSignIn(email.trim());
      }
      setStep('code');
    } catch (error) {
      fail(error instanceof Error ? error.message : t('account.invalidEmail'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      if (mode === 'link') {
        // user_id sie nie zmienia, wiec cala dotychczasowa historia zostaje.
        await confirmEmailLink(email.trim(), code.trim());
      } else {
        await confirmSignIn(email.trim(), code.trim());
        // Wchodzimy na CUDZE (inne) konto — lokalne wpisy z sesji anonimowej
        // musza zniknac, zanim sync zdazy je tam wypchnac.
        await wipeLocalEntries();
        await resetPullWatermark();
      }
      await syncNow();
      setAccount(await getAccountState());
      setStep('email');
      setCode('');
      router.back();
    } catch (error) {
      fail(error instanceof Error ? error.message : t('account.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(t('account.signOut'), t('account.signOutWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.signOut'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await signOut();
            await wipeLocalEntries();
            await resetPullWatermark();
            setAccount(await getAccountState());
            router.back();
          })();
        },
      },
    ]);
  };

  if (!account) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {account.kind === 'offline' ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>{t('sync.offline')}</Text>
          ) : account.kind === 'linked' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('account.linked', { email: account.email })}
              </Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>
                {t('account.signOutWarning')}
              </Text>
              <Pressable onPress={confirmSignOut} accessibilityRole="button">
                <Text style={[styles.link, { color: colors.accent }]}>{t('account.signOut')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                {mode === 'link' ? t('account.protectTitle') : t('account.haveAccount')}
              </Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>
                {mode === 'link' ? t('account.protectBody') : t('account.restoreWarning')}
              </Text>

              {step === 'email' ? (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    {t('account.emailLabel')}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('account.emailPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    inputMode="email"
                  />
                  <PrimaryButton
                    label={t('account.sendCode')}
                    busy={busy}
                    onPress={() => void sendCode()}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.body, { color: colors.textMuted }]}>
                    {t('account.codeSent', { email: email.trim() })}
                  </Text>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    {t('account.codeLabel')}
                  </Text>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    style={[
                      styles.input,
                      styles.code,
                      { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    autoFocus
                  />
                  <PrimaryButton
                    label={mode === 'link' ? t('account.verify') : t('account.restoreCta')}
                    busy={busy}
                    onPress={() => void verify()}
                  />
                </>
              )}

              {step === 'email' ? (
                <Pressable
                  onPress={() => setMode(mode === 'link' ? 'restore' : 'link')}
                  accessibilityRole="button">
                  <Text style={[styles.link, { color: colors.accent }]}>
                    {mode === 'link' ? t('account.haveAccount') : t('account.protectCta')}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PrimaryButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: colors.accent, opacity: busy ? 0.6 : 1 }]}>
      {busy ? (
        <ActivityIndicator color={colors.bg} />
      ) : (
        <Text style={[styles.buttonLabel, { color: colors.bg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  input: {
    fontSize: 17,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  code: {
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    minHeight: 48,
    marginTop: Spacing.sm,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
});
