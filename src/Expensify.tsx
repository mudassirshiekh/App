import {Audio} from 'expo-av';
import React, {useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {NativeEventSubscription} from 'react-native';
import {AppState, Linking, NativeModules, Platform} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import Onyx, {useOnyx} from 'react-native-onyx';
import ConfirmModal from './components/ConfirmModal';
import DeeplinkWrapper from './components/DeeplinkWrapper';
import EmojiPicker from './components/EmojiPicker/EmojiPicker';
import FocusModeNotification from './components/FocusModeNotification';
import GrowlNotification from './components/GrowlNotification';
import RequireTwoFactorAuthenticationModal from './components/RequireTwoFactorAuthenticationModal';
import AppleAuthWrapper from './components/SignInButtons/AppleAuthWrapper';
import SplashScreenHider from './components/SplashScreenHider';
import UpdateAppModal from './components/UpdateAppModal';
import * as CONFIG from './CONFIG';
import CONST from './CONST';
import useLocalize from './hooks/useLocalize';
import {updateLastRoute} from './libs/actions/App';
import * as EmojiPickerAction from './libs/actions/EmojiPickerAction';
import * as Report from './libs/actions/Report';
import * as User from './libs/actions/User';
import * as ActiveClientManager from './libs/ActiveClientManager';
import FS from './libs/Fullstory';
import * as Growl from './libs/Growl';
import Log from './libs/Log';
import migrateOnyx from './libs/migrateOnyx';
import Navigation from './libs/Navigation/Navigation';
import NavigationRoot from './libs/Navigation/NavigationRoot';
import NetworkConnection from './libs/NetworkConnection';
import PushNotification from './libs/Notification/PushNotification';
import './libs/Notification/PushNotification/subscribePushNotification';
import Performance from './libs/Performance';
import setCrashlyticsUserId from './libs/setCrashlyticsUserId';
import StartupTimer from './libs/StartupTimer';
// This lib needs to be imported, but it has nothing to export since all it contains is an Onyx connection
import './libs/UnreadIndicatorUpdater';
import Visibility from './libs/Visibility';
import ONYXKEYS from './ONYXKEYS';
import PopoverReportActionContextMenu from './pages/home/report/ContextMenu/PopoverReportActionContextMenu';
import * as ReportActionContextMenu from './pages/home/report/ContextMenu/ReportActionContextMenu';
import type {Route} from './ROUTES';
import ROUTES from './ROUTES';
import SplashScreenStateContext from './SplashScreenStateContext';
import type {ScreenShareRequest} from './types/onyx';

Onyx.registerLogger(({level, message}) => {
    if (level === 'alert') {
        Log.alert(message);
        console.error(message);
    } else if (level === 'hmmm') {
        Log.hmmm(message);
    } else {
        Log.info(message);
    }
});

type ExpensifyProps = {
    /** Whether the app is waiting for the server's response to determine if a room is public */
    isCheckingPublicRoom: OnyxEntry<boolean>;

    /** Whether a new update is available and ready to install. */
    updateAvailable: OnyxEntry<boolean>;

    /** Tells us if the sidebar has rendered */
    isSidebarLoaded: OnyxEntry<boolean>;

    /** Information about a screen share call requested by a GuidesPlus agent */
    screenShareRequest: OnyxEntry<ScreenShareRequest>;

    /** True when the user must update to the latest minimum version of the app */
    updateRequired: OnyxEntry<boolean>;

    /** Whether we should display the notification alerting the user that focus mode has been auto-enabled */
    focusModeNotification: OnyxEntry<boolean>;

    /** Last visited path in the app */
    lastVisitedPath: OnyxEntry<string | undefined>;
};
function Expensify() {
    const appStateChangeListener = useRef<NativeEventSubscription | null>(null);
    const [isNavigationReady, setIsNavigationReady] = useState(false);
    const [isOnyxMigrated, setIsOnyxMigrated] = useState(false);
    const {splashScreenState, setSplashScreenState} = useContext(SplashScreenStateContext);
    const [hasAttemptedToOpenPublicRoom, setAttemptedToOpenPublicRoom] = useState(false);
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [lastRoute] = useOnyx(ONYXKEYS.LAST_ROUTE);
    const [userMetadata] = useOnyx(ONYXKEYS.USER_METADATA);
    const [shouldShowRequire2FAModal, setShouldShowRequire2FAModal] = useState(false);
    const [isCheckingPublicRoom] = useOnyx(ONYXKEYS.IS_CHECKING_PUBLIC_ROOM);
    const [updateAvailable] = useOnyx(ONYXKEYS.UPDATE_AVAILABLE);
    const [updateRequired] = useOnyx(ONYXKEYS.UPDATE_REQUIRED);
    const [isSidebarLoaded] = useOnyx(ONYXKEYS.IS_SIDEBAR_LOADED);
    const [screenShareRequest] = useOnyx(ONYXKEYS.SCREEN_SHARE_REQUEST);
    const [focusModeNotification] = useOnyx(ONYXKEYS.FOCUS_MODE_NOTIFICATION);
    const [lastVisitedPath] = useOnyx(ONYXKEYS.LAST_VISITED_PATH);

    useEffect(() => {
        if (!account?.needsTwoFactorAuthSetup || account.requiresTwoFactorAuth) {
            return;
        }
        setShouldShowRequire2FAModal(true);
    }, [account?.needsTwoFactorAuthSetup, account?.requiresTwoFactorAuth]);

    const [initialUrl, setInitialUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isCheckingPublicRoom) {
            return;
        }
        setAttemptedToOpenPublicRoom(true);
    }, [isCheckingPublicRoom]);

    const isAuthenticated = useMemo(() => !!(session?.authToken ?? null), [session]);
    const autoAuthState = useMemo(() => session?.autoAuthState ?? '', [session]);

    const shouldInit = isNavigationReady && hasAttemptedToOpenPublicRoom;
    const shouldHideSplash =
        shouldInit &&
        (NativeModules.HybridAppModule ? splashScreenState === CONST.BOOT_SPLASH_STATE.READY_TO_BE_HIDDEN && isAuthenticated : splashScreenState === CONST.BOOT_SPLASH_STATE.VISIBLE);

    const initializeClient = () => {
        if (!Visibility.isVisible()) {
            return;
        }

        ActiveClientManager.init();
    };

    const setNavigationReady = useCallback(() => {
        setIsNavigationReady(true);

        // Navigate to any pending routes now that the NavigationContainer is ready
        Navigation.setIsNavigationReady();
    }, []);

    const onSplashHide = useCallback(() => {
        setSplashScreenState(CONST.BOOT_SPLASH_STATE.HIDDEN);
        Performance.markEnd(CONST.TIMING.SIDEBAR_LOADED);
    }, [setSplashScreenState]);

    useLayoutEffect(() => {
        // Initialize this client as being an active client
        ActiveClientManager.init();

        // Initialize Fullstory lib
        FS.init(userMetadata);

        // Used for the offline indicator appearing when someone is offline
        const unsubscribeNetInfo = NetworkConnection.subscribeToNetInfo();

        return unsubscribeNetInfo;

        // This would alerting because of userMetadata. We'll remove the linter rule since
        // we don't really need to run this effect again if that value changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Log the platform and config to debug .env issues
    useEffect(() => {
        Log.info('App launched', false, {Platform, CONFIG});
    }, []);

    useEffect(() => {
        setTimeout(() => {
            const appState = AppState.currentState;
            Log.info('[BootSplash] splash screen status', false, {appState, splashScreenState});

            if (splashScreenState === CONST.BOOT_SPLASH_STATE.VISIBLE) {
                const propsToLog: Omit<ExpensifyProps & {isAuthenticated: boolean}, 'children' | 'session'> = {
                    isCheckingPublicRoom,
                    updateRequired,
                    updateAvailable,
                    isSidebarLoaded,
                    screenShareRequest,
                    focusModeNotification,
                    isAuthenticated,
                    lastVisitedPath,
                };
                Log.alert('[BootSplash] splash screen is still visible', {propsToLog}, false);
            }
        }, 30 * 1000);

        // This timer is set in the native layer when launching the app and we stop it here so we can measure how long
        // it took for the main app itself to load.
        StartupTimer.stop();

        // Run any Onyx schema migrations and then continue loading the main app
        migrateOnyx().then(() => {
            // In case of a crash that led to disconnection, we want to remove all the push notifications.
            if (!isAuthenticated) {
                PushNotification.clearNotifications();
            }

            setIsOnyxMigrated(true);
        });

        appStateChangeListener.current = AppState.addEventListener('change', initializeClient);

        // If the app is opened from a deep link, get the reportID (if exists) from the deep link and navigate to the chat report
        Linking.getInitialURL().then((url) => {
            setInitialUrl(url);
            Report.openReportFromDeepLink(url ?? '');
        });

        // Open chat report from a deep link (only mobile native)
        Linking.addEventListener('url', (state) => {
            Report.openReportFromDeepLink(state.url);
        });

        return () => {
            if (!appStateChangeListener.current) {
                return;
            }
            appStateChangeListener.current.remove();
        };
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps -- we don't want this effect to run again
    }, []);

    // This is being done since we want to play sound even when iOS device is on silent mode, to align with other platforms.
    useEffect(() => {
        Audio.setAudioModeAsync({playsInSilentModeIOS: true});
    }, []);

    useLayoutEffect(() => {
        if (!isNavigationReady || !lastRoute) {
            return;
        }
        updateLastRoute('');
        Navigation.navigate(lastRoute as Route);
        // Disabling this rule because we only want it to run on the first render.
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    }, [isNavigationReady]);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }
        setCrashlyticsUserId(session?.accountID ?? -1);
    }, [isAuthenticated, session?.accountID]);

    // Display a blank page until the onyx migration completes
    if (!isOnyxMigrated) {
        return null;
    }

    if (updateRequired) {
        throw new Error(CONST.ERROR.UPDATE_REQUIRED);
    }

    return (
        <DeeplinkWrapper
            isAuthenticated={isAuthenticated}
            autoAuthState={autoAuthState}
            initialUrl={initialUrl ?? ''}
        >
            {shouldInit && (
                <>
                    <GrowlNotification ref={Growl.growlRef} />
                    <PopoverReportActionContextMenu ref={ReportActionContextMenu.contextMenuRef} />
                    <EmojiPicker ref={EmojiPickerAction.emojiPickerRef} />
                    {/* We include the modal for showing a new update at the top level so the option is always present. */}
                    {updateAvailable && !updateRequired ? <UpdateAppModal /> : null}
                    {screenShareRequest ? (
                        <ConfirmModal
                            title={translate('guides.screenShare')}
                            onConfirm={() => User.joinScreenShare(screenShareRequest.accessToken, screenShareRequest.roomName)}
                            onCancel={User.clearScreenShareRequest}
                            prompt={translate('guides.screenShareRequest')}
                            confirmText={translate('common.join')}
                            cancelText={translate('common.decline')}
                            isVisible
                        />
                    ) : null}
                    {focusModeNotification ? <FocusModeNotification /> : null}
                    {shouldShowRequire2FAModal ? (
                        <RequireTwoFactorAuthenticationModal
                            onSubmit={() => {
                                setShouldShowRequire2FAModal(false);
                                Navigation.navigate(ROUTES.SETTINGS_2FA.getRoute(ROUTES.HOME));
                            }}
                            isVisible
                            description={translate('twoFactorAuth.twoFactorAuthIsRequiredForAdminsDescription')}
                        />
                    ) : null}
                </>
            )}

            <AppleAuthWrapper />
            {hasAttemptedToOpenPublicRoom && (
                <NavigationRoot
                    onReady={setNavigationReady}
                    authenticated={isAuthenticated}
                    lastVisitedPath={lastVisitedPath as Route}
                    initialUrl={initialUrl}
                    shouldShowRequire2FAModal={shouldShowRequire2FAModal}
                />
            )}
            {shouldHideSplash && <SplashScreenHider onHide={onSplashHide} />}
        </DeeplinkWrapper>
    );
}

Expensify.displayName = 'Expensify';

export default Expensify;
