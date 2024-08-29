import type {ParamListBase, StackActionHelpers} from '@react-navigation/native';
import {StackRouter, useNavigationBuilder} from '@react-navigation/native';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import {StackView} from '@react-navigation/stack';
import React, {useEffect, useMemo} from 'react';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import convertToWebNavigationOptions from '@libs/Navigation/PlatformStackNavigation/navigationOptions/convertToWebNavigationOptions';
import type {
    CreatePlatformStackNavigatorComponentOptions,
    CustomCodeProps,
    CustomCodePropsWithTransformedState,
    PlatformNavigationBuilderOptions,
    PlatformStackNavigationOptions,
    PlatformStackNavigationState,
    PlatformStackNavigatorProps,
    PlatformStackRouterOptions,
} from '@libs/Navigation/PlatformStackNavigation/types';

function createPlatformStackNavigatorComponent<RouterOptions extends PlatformStackRouterOptions = PlatformStackRouterOptions>(
    displayName: string,
    options?: CreatePlatformStackNavigatorComponentOptions<RouterOptions>,
) {
    const createRouter = options?.createRouter ?? StackRouter;
    const transformState = options?.transformState;
    const defaultScreenOptions = options?.defaultScreenOptions;
    const ExtraContent = options?.ExtraContent;
    const NavigationContentWrapper = options?.NavigationContentWrapper;
    const onIsSmallScreenWidthChange = options?.onIsSmallScreenWidthChange;

    function PlatformNavigator({id, initialRouteName, screenOptions, screenListeners, children, ...props}: PlatformStackNavigatorProps<ParamListBase>) {
        const styles = useThemeStyles();
        const windowDimensions = useWindowDimensions();

        const {navigation, state, descriptors, NavigationContent} = useNavigationBuilder<
            PlatformStackNavigationState<ParamListBase>,
            RouterOptions,
            StackActionHelpers<ParamListBase>,
            StackNavigationOptions,
            StackNavigationEventMap,
            PlatformStackNavigationOptions
        >(
            createRouter,
            {
                id,
                children,
                screenOptions,
                defaultScreenOptions,
                screenListeners,
                initialRouteName,
            } as PlatformNavigationBuilderOptions<PlatformStackNavigationOptions, StackNavigationEventMap, ParamListBase, RouterOptions>,
            convertToWebNavigationOptions,
        );

        const customCodeProps = useMemo<CustomCodeProps<StackNavigationOptions, StackNavigationEventMap, ParamListBase, StackActionHelpers<ParamListBase>>>(
            () => ({
                state,
                navigation,
                descriptors,
                displayName,
            }),
            [state, navigation, descriptors],
        );

        const {stateToRender, searchRoute} = useMemo(
            () => transformState?.({...customCodeProps, styles, windowDimensions}) ?? {stateToRender: state, searchRoute: undefined},
            [customCodeProps, state, styles, windowDimensions],
        );

        const customCodePropsWithTransformedState = useMemo<
            CustomCodePropsWithTransformedState<StackNavigationOptions, StackNavigationEventMap, ParamListBase, StackActionHelpers<ParamListBase>>
        >(
            () => ({
                ...customCodeProps,
                searchRoute,
                stateToRender,
            }),
            [customCodeProps, searchRoute, stateToRender],
        );

        const Content = useMemo(
            () => (
                <NavigationContent>
                    <StackView
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...props}
                        state={stateToRender}
                        descriptors={descriptors}
                        navigation={navigation}
                    />

                    {ExtraContent && (
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        <ExtraContent {...customCodePropsWithTransformedState} />
                    )}
                </NavigationContent>
            ),
            [NavigationContent, customCodePropsWithTransformedState, descriptors, navigation, props, stateToRender],
        );

        useEffect(() => {
            onIsSmallScreenWidthChange?.({...customCodePropsWithTransformedState, windowDimensions});
            // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
        }, [windowDimensions.isSmallScreenWidth]);

        // eslint-disable-next-line react/jsx-props-no-spreading
        return NavigationContentWrapper === undefined ? Content : <NavigationContentWrapper {...customCodePropsWithTransformedState}>{Content}</NavigationContentWrapper>;
    }
    PlatformNavigator.displayName = displayName;

    return PlatformNavigator;
}

export default createPlatformStackNavigatorComponent;
